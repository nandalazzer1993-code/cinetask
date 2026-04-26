import { Link, useNavigate } from "@tanstack/react-router";
import { Film, LogOut, User as UserIcon, Wallet, Shield, LayoutDashboard, Menu, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function Navbar() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
            <Film className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold tracking-tight">
            CINE<span className="text-gradient-primary">TASK</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-2">
          {user ? (
            <>
              <Link to="/dashboard"><Button variant="ghost" size="sm"><LayoutDashboard className="h-4 w-4 mr-2" />{t("dashboard")}</Button></Link>
              <Link to="/tasks"><Button variant="ghost" size="sm"><Film className="h-4 w-4 mr-2" />{t("tasks")}</Button></Link>
              <Link to="/wallet"><Button variant="ghost" size="sm"><Wallet className="h-4 w-4 mr-2" />{t("wallet")}</Button></Link>
              <Link to="/account"><Button variant="ghost" size="sm"><UserIcon className="h-4 w-4 mr-2" />{t("account")}</Button></Link>
              {isAdmin && <Link to="/admin"><Button variant="ghost" size="sm" className="text-accent"><Shield className="h-4 w-4 mr-2" />{t("admin")}</Button></Link>}
              {profile && (
                <div className="ml-2 rounded-md bg-card px-3 py-1.5 text-sm">
                  <span className="text-muted-foreground">{t("balance")}:</span>{" "}
                  <span className="font-semibold text-accent">${Number(profile.balance).toFixed(2)}</span>
                </div>
              )}
              <Button size="sm" variant="outline" onClick={handleSignOut}><LogOut className="h-4 w-4" /></Button>
            </>
          ) : (
            <>
              <Link to="/auth"><Button variant="ghost" size="sm">{t("signIn")}</Button></Link>
              <Link to="/auth" search={{ mode: "signup" }}><Button size="sm" className="bg-gradient-primary shadow-glow">{t("getStarted")}</Button></Link>
            </>
          )}
        </nav>

        <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="menu">
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border/60 bg-background/95">
          <div className="container mx-auto px-4 py-3 flex flex-col gap-2">
            {user ? (
              <>
                {profile && (
                  <div className="rounded-md bg-card px-3 py-2 text-sm">
                    {t("balance")}: <span className="font-semibold text-accent">${Number(profile.balance).toFixed(2)}</span> · VIP {profile.vip_level}
                  </div>
                )}
                <Link to="/dashboard" onClick={() => setOpen(false)}><Button variant="ghost" className="w-full justify-start"><LayoutDashboard className="h-4 w-4 mr-2" />{t("dashboard")}</Button></Link>
                <Link to="/tasks" onClick={() => setOpen(false)}><Button variant="ghost" className="w-full justify-start"><Film className="h-4 w-4 mr-2" />{t("tasks")}</Button></Link>
                <Link to="/wallet" onClick={() => setOpen(false)}><Button variant="ghost" className="w-full justify-start"><Wallet className="h-4 w-4 mr-2" />{t("wallet")}</Button></Link>
                <Link to="/account" onClick={() => setOpen(false)}><Button variant="ghost" className="w-full justify-start"><UserIcon className="h-4 w-4 mr-2" />{t("account")}</Button></Link>
                {isAdmin && <Link to="/admin" onClick={() => setOpen(false)}><Button variant="ghost" className="w-full justify-start text-accent"><Shield className="h-4 w-4 mr-2" />{t("admin")}</Button></Link>}
                <Button variant="outline" onClick={handleSignOut}><LogOut className="h-4 w-4 mr-2" />{t("signOut")}</Button>
              </>
            ) : (
              <>
                <Link to="/auth" onClick={() => setOpen(false)}><Button variant="ghost" className="w-full">{t("signIn")}</Button></Link>
                <Link to="/auth" search={{ mode: "signup" }} onClick={() => setOpen(false)}><Button className="w-full bg-gradient-primary">{t("getStarted")}</Button></Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
