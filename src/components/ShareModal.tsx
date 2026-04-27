import React, { useState, useEffect } from "react";
import emailjs from "@emailjs/browser";
import { db, UserProfile } from "@/lib/firebase";
import { doc, updateDoc, arrayUnion, arrayRemove, collection, query, where, getDocs } from "firebase/firestore";
import { toast } from "sonner";
import { chunkForFirestore, FIRESTORE_IN_LIMIT, normalizeEmail } from "@/lib/sharing";
import { UserPlus, X, Mail, CheckCircle2, Clock, Users, Send } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";

interface SharedUser {
  email: string;
  displayName?: string;
  photoURL?: string;
  isRegistered: boolean; // found in Firestore users collection
}

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile | null;
}

export default function ShareModal({ isOpen, onClose, profile }: ShareModalProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Quando o modal abrir, buscar os perfis de quem está compartilhado
  useEffect(() => {
    if (!isOpen || !profile?.sharedWith || profile.sharedWith.length === 0) {
      setSharedUsers([]);
      return;
    }
    fetchSharedUserProfiles(profile.sharedWith);
  }, [isOpen, profile?.sharedWith]);

  const fetchSharedUserProfiles = async (emails: string[]) => {
    setLoadingUsers(true);
    try {
      const usersRef = collection(db, "users");
      const foundProfiles = new Map<string, UserProfile>();
      const normalizedEmails = Array.from(new Set(emails.map((email) => normalizeEmail(email)).filter(Boolean))) as string[];
      const emailChunks = chunkForFirestore(normalizedEmails, FIRESTORE_IN_LIMIT);

      for (const emailChunk of emailChunks) {
        const q = query(usersRef, where("email", "in", emailChunk));
        const snapshot = await getDocs(q);

        snapshot.docs.forEach(d => {
          const p = d.data() as UserProfile;
          foundProfiles.set(p.email.toLowerCase(), p);
        });
      }

      const resolved: SharedUser[] = emails.map(e => {
        const found = foundProfiles.get(e.toLowerCase());
        return found
          ? { email: e, displayName: found.displayName, photoURL: found.photoURL, isRegistered: true }
          : { email: e, isRegistered: false };
      });

      setSharedUsers(resolved);
    } catch (err) {
      console.error("Erro ao buscar perfis:", err);
      setSharedUsers(emails.map(e => ({ email: e, isRegistered: false })));
    } finally {
      setLoadingUsers(false);
    }
  };

  const sendInviteEmail = async (targetEmail: string) => {
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;

    // Se as variáveis não estiverem configuradas, pular o envio de email silenciosamente
    if (!publicKey || !serviceId || !templateId) {
      console.warn("⚠️ [EmailJS] Variáveis de ambiente não configuradas. Email não enviado.");
      return;
    }

    const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;

    await emailjs.send(
      serviceId,
      templateId,
      {
        to_email: targetEmail,
        from_name: profile?.displayName || "Um usuário",
        app_url: appUrl,
        from_email: profile?.email || "",
      },
      publicKey
    );
  };

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !email) return;

    const normalizedEmail = email.toLowerCase().trim();

    if (normalizedEmail === profile.email?.toLowerCase()) {
      toast.error("Você não pode compartilhar com você mesmo.");
      return;
    }

    if (profile.sharedWith?.includes(normalizedEmail)) {
      toast.error("Este email já tem acesso.");
      return;
    }

    if ((profile.sharedWith?.length ?? 0) >= FIRESTORE_IN_LIMIT) {
      toast.error(`Limite atual de compartilhamento atingido (${FIRESTORE_IN_LIMIT} emails).`);
      return;
    }

    setLoading(true);
    try {
      // 1. Adicionar o email à lista de compartilhamento
      const userRef = doc(db, "users", profile.uid);
      await updateDoc(userRef, {
        sharedWith: arrayUnion(normalizedEmail)
      });

      // 2. Tentar enviar email de convite
      try {
        await sendInviteEmail(normalizedEmail);
        toast.success(`Convite enviado para ${normalizedEmail}!`, {
          description: "Um email foi enviado com as instruções de acesso.",
        });
      } catch (emailErr) {
        // Compartilhamento adicionado mas email falhou
        console.error("Erro ao enviar email:", emailErr);
        toast.success(`Acesso compartilhado com ${normalizedEmail}.`, {
          description: "Não foi possível enviar o email de convite. Informe a pessoa manualmente.",
        });
      }

      setEmail("");
    } catch (err) {
      toast.error("Erro ao compartilhar acesso");
    } finally {
      setLoading(false);
    }
  };

  const removeShare = async (targetEmail: string) => {
    if (!profile) return;
    try {
      const userRef = doc(db, "users", profile.uid);
      await updateDoc(userRef, {
        sharedWith: arrayRemove(targetEmail)
      });
      toast.success("Acesso removido");
    } catch (e) {
      toast.error("Erro ao remover acesso");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            Compartilhar Acesso
          </DialogTitle>
          <DialogDescription>
            Convide sua esposa ou parceiro(a) para visualizar e gerenciar as finanças juntos. Eles receberão um email de convite.
          </DialogDescription>
        </DialogHeader>

        {/* Invite Form */}
        <form onSubmit={handleShare} className="space-y-3 py-2">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-semibold uppercase text-zinc-500 tracking-wider">
              E-mail do convidado
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="exemplo@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button
                type="submit"
                disabled={loading || !email}
                className="bg-blue-600 hover:bg-blue-700 gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                {loading ? "Enviando..." : "Convidar"}
              </Button>
            </div>
          </div>
        </form>

        {/* People with access */}
        <div className="space-y-3 pt-2">
          <Label className="text-xs font-semibold uppercase text-zinc-400 tracking-wider">
            Pessoas com acesso ({profile?.sharedWith?.length || 0})
          </Label>

          {loadingUsers ? (
            <div className="flex items-center gap-2 py-3 text-sm text-zinc-400">
              <div className="w-4 h-4 border-2 border-zinc-300 border-t-blue-500 rounded-full animate-spin" />
              Buscando informações...
            </div>
          ) : (
            <div className="space-y-2">
              {sharedUsers.length > 0 ? (
                sharedUsers.map((person) => (
                  <div
                    key={person.email}
                    className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100 group"
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      {person.photoURL ? (
                        <img
                          src={person.photoURL}
                          alt={person.displayName || person.email}
                          className="w-9 h-9 rounded-full object-cover border border-zinc-200"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                          {(person.displayName || person.email)[0].toUpperCase()}
                        </div>
                      )}

                      {/* Name + Status */}
                      <div>
                        <p className="text-sm font-semibold text-zinc-800 leading-tight">
                          {person.displayName || "Usuário não registrado"}
                        </p>
                        <p className="text-xs text-zinc-400">{person.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Status badge */}
                      {person.isRegistered ? (
                        <div className="flex items-center gap-1 text-emerald-600 text-[10px] font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                          <CheckCircle2 className="w-3 h-3" />
                          Ativo
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-amber-600 text-[10px] font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                          <Clock className="w-3 h-3" />
                          Pendente
                        </div>
                      )}

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeShare(person.email)}
                        className="h-8 w-8 text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remover acesso"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center gap-2 py-6 text-zinc-400">
                  <UserPlus className="w-8 h-8 text-zinc-300" />
                  <p className="text-sm">Ninguém convidado ainda.</p>
                  <p className="text-xs text-center">Adicione o email acima para compartilhar o dashboard.</p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="w-full">Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
