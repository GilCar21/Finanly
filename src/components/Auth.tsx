import React from "react";
import { Wallet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";

interface AuthProps {
  onSignIn: () => void;
}

export default function Auth({ onSignIn }: AuthProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
      <Card className="w-full max-w-md border-zinc-200 shadow-xl shadow-zinc-200/50">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
            <Wallet className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold tracking-tight">Finanças em Família</CardTitle>
            <CardDescription className="text-zinc-500">
              Gerencie suas contas e da sua esposa em um só lugar.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={onSignIn}
            className="w-full h-12 text-base font-medium bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-50 flex items-center justify-center gap-3 shadow-sm transition-all active:scale-95"
          >
            <img src="https://www.google.com/favicon.ico" alt="" className="w-5 h-5" />
            Entrar com Google
          </Button>
          <p className="text-center text-xs text-zinc-400 px-6">
            Ao entrar, você concorda em compartilhar seus dados financeiros com as pessoas que você autorizar.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
