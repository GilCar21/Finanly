import React, { useState } from "react";

import { db, UserProfile } from "@/lib/firebase";
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { toast } from "sonner";
import { UserPlus, X, Mail } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile | null;
}

export default function ShareModal({ isOpen, onClose, profile }: ShareModalProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !email) return;

    setLoading(true);
    try {
      const userRef = doc(db, "users", profile.uid);
      await updateDoc(userRef, {
        sharedWith: arrayUnion(email.toLowerCase().trim())
      });
      toast.success(`Acesso compartilhado com ${email}`);
      setEmail("");
    } catch (e) {
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-600" />
            Compartilhar Acesso
          </DialogTitle>
          <DialogDescription>
            Convide sua esposa ou parceiro(a) para visualizar e gerenciar as contas juntos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleShare} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail do convidado</Label>
            <div className="flex gap-2">
              <Input
                id="email"
                type="email"
                placeholder="exemplo@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={loading || !email} className="bg-blue-600 hover:bg-blue-700">
                Convidar
              </Button>
            </div>
          </div>
        </form>

        <div className="space-y-3">
          <Label className="text-zinc-500 text-xs uppercase tracking-wider">Pessoas com acesso</Label>
          <div className="space-y-2">
            {profile?.sharedWith && profile.sharedWith.length > 0 ? (
              profile.sharedWith.map((sharedEmail) => (
                <div key={sharedEmail} className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg border border-zinc-100">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-zinc-400" />
                    <span className="text-sm font-medium">{sharedEmail}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeShare(sharedEmail)}
                    className="h-8 w-8 text-zinc-400 hover:text-red-600"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-sm text-zinc-400 italic py-2">Ninguém convidado ainda.</p>
            )}
          </div>
        </div>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={onClose} className="w-full">Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
