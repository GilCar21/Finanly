import React, { useState, useCallback } from "react";

import { useDropzone } from "react-dropzone";
import { FileUp, Loader2, CheckCircle2, Trash2, AlertTriangle, CreditCard, Wallet } from "lucide-react";
import { extractTransactionsFromFile, ExtractedTransaction } from "@/services/geminiService";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/constants";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import { CATEGORIES } from "@/lib/constants";
import { Category } from "@/lib/firebase";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  sharedWith: string[];
  customCategories: Category[];
  currentYear: number;
  currentMonth: number;
  existingTransactions: any[];
}

export default function ImportModal({ isOpen, onClose, userId, sharedWith, customCategories, currentYear, currentMonth, existingTransactions }: ImportModalProps) {
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("");
  const [preview, setPreview] = useState<(ExtractedTransaction & { isDuplicate?: boolean })[]>([]);
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [importType, setImportType] = useState<'debit' | 'credit'>('debit');
  const [dueDay, setDueDay] = useState<string>("24");
  const [importMonth, setImportMonth] = useState<string>(currentMonth.toString());

  // Resetar estados ao abrir o modal para evitar que configurações anteriores persistam
  React.useEffect(() => {
    if (isOpen) {
      setStep('upload');
      setPreview([]);
      setImportType('debit');
      setImportMonth(currentMonth.toString());
      setLoading(false);
      setLoadingStatus("");
    }
  }, [isOpen, currentMonth]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

      console.log("📂 [Import] Arquivo recebido:", { 
        name: file.name, 
        type: file.type,
        size: file.size,
        importType,
        month: format(new Date(currentYear, parseInt(importMonth), 1), "MMMM/yyyy", { locale: ptBR })
      });

      setLoading(true);
      setLoadingStatus("Lendo arquivo...");
    try {
      const reader = new FileReader();
      
      const fileData = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setLoadingStatus("IA analisando dados e categorias...");
      const allCategoryNames = [...CATEGORIES.map(c => c.name), ...customCategories.map(c => c.name)];
      const results = await extractTransactionsFromFile(fileData, file.type, allCategoryNames);
      
      setLoadingStatus("Finalizando processamento...");
      
      let processedResults = results;
      if (importType === 'credit' && dueDay) {
        const selectedMonth = parseInt(importMonth);
        const normalizedDate = `${currentYear}-${(selectedMonth + 1).toString().padStart(2, '0')}-${dueDay.padStart(2, '0')}`;
        processedResults = results.map(tx => ({
          ...tx,
          description: `(${tx.date}) ${tx.description}`, // Manter data original na descrição
          date: normalizedDate
        }));
      }

      const finalResults = processedResults.map(tx => {
        // Verificar duplicidade
        const isDuplicate = existingTransactions.some(existing => {
          const sameDate = existing.date === tx.date;
          const sameAmount = Math.abs(existing.amount) === Math.abs(tx.amount);
          // Limpeza básica na descrição para comparação mais rigorosa
          const existingDesc = existing.description.toLowerCase().trim();
          const extractedDesc = tx.description.toLowerCase().trim();
          
          return sameDate && sameAmount && (existingDesc.includes(extractedDesc) || extractedDesc.includes(existingDesc));
        });

        return {
          ...tx,
          isDuplicate
        };
      });

      const duplicatesFound = finalResults.filter(tx => tx.isDuplicate).length;
      console.log(`📊 [Import] Processamento concluído: ${finalResults.length} total, ${duplicatesFound} duplicados detectados.`);

      setPreview(finalResults);
      setStep('preview');
    } catch (e: any) {
      console.error("❌ [Import] Erro no processamento do arquivo:", e);
      toast.error("Erro ao processar arquivo");
    } finally {
      setLoading(false);
      setLoadingStatus("");
    }
  }, [importType, dueDay, importMonth, currentYear, currentMonth, customCategories, existingTransactions]);

  const handleUpdateItem = (index: number, field: keyof ExtractedTransaction, value: any) => {
    const newPreview = [...preview];
    newPreview[index] = { ...newPreview[index], [field]: value };
    setPreview(newPreview);
  };

  const handleDeleteConfirmed = () => {
    if (deleteIndex !== null) {
      setPreview(prev => prev.filter((_, i) => i !== deleteIndex));
      setDeleteIndex(null);
      toast.info("Transação removida da importação");
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/csv': ['.csv']
    },
    multiple: false
  } as any);

  const handleImport = async () => {
    setLoading(true);
    try {
      const promises = preview.map(tx =>
        addDoc(collection(db, "transactions"), {
          ...tx,
          userId,
          status: 'paid',
          sharedWith
        })
      );
      await Promise.all(promises);
      toast.success(`${preview.length} transações importadas com sucesso!`);
      onClose();
      setStep('upload');
      setPreview([]);
    } catch (e) {
      toast.error("Erro ao importar transações");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Importar Fatura ou Extrato</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {step === 'upload' ? (
            <div className="space-y-6">
              {/* Opções de Importação */}
              <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold uppercase text-zinc-500 ml-1">Tipo de Arquivo</label>
                  <div className="flex p-1 bg-zinc-200/50 rounded-lg">
                    <button
                      onClick={() => setImportType('debit')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
                        importType === 'debit' ? 'bg-white text-blue-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
                      }`}
                    >
                      <Wallet className="w-4 h-4" />
                      Extrato (Débito)
                    </button>
                    <button
                      onClick={() => setImportType('credit')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
                        importType === 'credit' ? 'bg-white text-blue-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      Fatura (Cartão)
                    </button>
                  </div>
                </div>

                {importType === 'credit' && (
                  <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                    <label className="text-[10px] font-bold uppercase text-zinc-500 ml-1">Dia e Mês de Referência</label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        max="31"
                        value={dueDay}
                        onChange={(e) => setDueDay(e.target.value)}
                        className="w-20 h-10"
                        placeholder="Dia"
                      />
                      <Select value={importMonth} onValueChange={setImportMonth}>
                        <SelectTrigger className="flex-1 h-10">
                          <SelectValue>
                            {format(new Date(currentYear, parseInt(importMonth), 1), "MMMM", { locale: ptBR })}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }).map((_, i) => (
                            <SelectItem key={i} value={i.toString()}>
                              {format(new Date(currentYear, i, 1), "MMMM", { locale: ptBR })}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-zinc-500 min-w-fit">
                        Lançar em <span className="font-bold">{dueDay}/{(parseInt(importMonth) + 1).toString().padStart(2, '0')}</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer
                  ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-zinc-200 hover:border-zinc-300'}
                  ${loading ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <input {...getInputProps()} />
                {loading ? (
                  <div className="flex flex-col items-center gap-4 py-4">
                    <div className="relative">
                      <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 bg-blue-100 rounded-full animate-ping" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-zinc-900 font-bold text-lg">Processando...</p>
                      <p className="text-zinc-500 text-sm animate-pulse">{loadingStatus}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center">
                      <FileUp className="w-8 h-8 text-zinc-400" />
                    </div>
                    <div>
                      <p className="text-zinc-900 font-semibold">Arraste seu PDF ou CSV aqui</p>
                      <p className="text-zinc-500 text-sm mt-1">Ou clique para selecionar o arquivo</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                <div className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">{preview.length} transações prontas para importar</span>
                </div>
                <div className="flex gap-2">
                  {preview.some(tx => tx.isDuplicate) && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setPreview(prev => prev.filter(tx => !tx.isDuplicate))}
                      className="text-amber-700 border-amber-200 hover:bg-amber-100 gap-1 h-8"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remover Duplicados
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => setStep('upload')} className="text-emerald-700 hover:bg-emerald-100 h-8" disabled={loading}>
                    Trocar arquivo
                  </Button>
                </div>
              </div>

              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 border-b">
                    <tr>
                      <th className="p-2 w-8"></th>
                      <th className="text-left p-2 w-24">Data</th>
                      <th className="text-left p-2 min-w-[150px]">Descrição</th>
                      <th className="text-left p-2 w-28">Tipo</th>
                      <th className="text-right p-2 w-32">Valor</th>
                      <th className="p-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((tx, i) => (
                      <tr key={i} className={`border-b last:border-0 hover:bg-zinc-50/50 transition-colors ${tx.isDuplicate ? 'bg-amber-50/50' : ''}`}>
                        <td className="p-2 text-center">
                          {tx.isDuplicate && (
                            <div title="Esta transação parece já existir no seu banco de dados." className="cursor-help">
                              <AlertTriangle className="w-4 h-4 text-amber-500" />
                            </div>
                          )}
                        </td>
                        <td className="p-2">
                          <Input 
                            value={tx.date} 
                            onChange={(e) => handleUpdateItem(i, 'date', e.target.value)}
                            className="h-8 text-xs border-transparent hover:border-zinc-200 focus:border-blue-400 transition-all px-1"
                          />
                        </td>
                        <td className="p-2">
                          <Input 
                            value={tx.description} 
                            onChange={(e) => handleUpdateItem(i, 'description', e.target.value)}
                            className="h-8 text-xs font-semibold border-transparent hover:border-zinc-200 focus:border-blue-400 transition-all px-1"
                          />
                        </td>
                        <td className="p-2">
                          <Select 
                            value={tx.type} 
                            onValueChange={(v) => handleUpdateItem(i, 'type', v)}
                          >
                            <SelectTrigger className="h-8 text-[10px] w-full border-transparent hover:border-zinc-200 transition-all px-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="income">Receita</SelectItem>
                              <SelectItem value="expense">Despesa</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2">
                          <Input 
                            type="number"
                            value={tx.amount} 
                            onChange={(e) => handleUpdateItem(i, 'amount', parseFloat(e.target.value))}
                            className="h-8 text-right font-bold border-transparent hover:border-zinc-200 focus:border-blue-400 transition-all px-1"
                          />
                        </td>
                        <td className="p-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-zinc-300 hover:text-rose-600"
                            onClick={() => setDeleteIndex(i)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          {step === 'preview' && (
            <Button onClick={handleImport} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading ? "Importando..." : "Confirmar Importação"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
      <AlertDialog open={deleteIndex !== null} onOpenChange={(open) => !open && setDeleteIndex(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Remover Transação?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Deseja remover esta transação da lista de importação? Esta ação não pode ser desfeita, mas você poderá adicionar manualmente depois se desejar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirmed} className="bg-red-600 hover:bg-red-700">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
