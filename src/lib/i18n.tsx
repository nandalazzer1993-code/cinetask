import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export type Lang = "en" | "es" | "fr" | "de" | "zh" | "tr" | "ur" | "hi";

export const LANGUAGES: { code: Lang; label: string; native: string }[] = [
  { code: "en", label: "English", native: "English" },
  { code: "es", label: "Spanish", native: "Español" },
  { code: "fr", label: "French", native: "Français" },
  { code: "de", label: "German", native: "Deutsch" },
  { code: "zh", label: "Chinese", native: "中文" },
  { code: "tr", label: "Turkish", native: "Türkçe" },
  { code: "ur", label: "Urdu", native: "اردو" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
];

type Entry = Record<Lang, string>;

const dict: Record<string, Entry> = {
  // Nav
  dashboard: { en: "Dashboard", es: "Panel", fr: "Tableau", de: "Übersicht", zh: "仪表板", tr: "Panel", ur: "ڈیش بورڈ", hi: "डैशबोर्ड" },
  tasks: { en: "Tasks", es: "Tareas", fr: "Tâches", de: "Aufgaben", zh: "任务", tr: "Görevler", ur: "ٹاسکس", hi: "कार्य" },
  wallet: { en: "Wallet", es: "Billetera", fr: "Portefeuille", de: "Wallet", zh: "钱包", tr: "Cüzdan", ur: "والیٹ", hi: "वॉलेट" },
  account: { en: "Account", es: "Cuenta", fr: "Compte", de: "Konto", zh: "账户", tr: "Hesap", ur: "اکاؤنٹ", hi: "खाता" },
  admin: { en: "Admin", es: "Admin", fr: "Admin", de: "Admin", zh: "管理员", tr: "Yönetici", ur: "ایڈمن", hi: "व्यवस्थापक" },
  signOut: { en: "Sign Out", es: "Salir", fr: "Déconnexion", de: "Abmelden", zh: "退出", tr: "Çıkış", ur: "سائن آؤٹ", hi: "साइन आउट" },
  signIn: { en: "Sign In", es: "Iniciar sesión", fr: "Connexion", de: "Anmelden", zh: "登录", tr: "Giriş", ur: "سائن ان", hi: "साइन इन" },
  signUp: { en: "Create Account", es: "Crear cuenta", fr: "Créer un compte", de: "Konto erstellen", zh: "创建账户", tr: "Hesap Oluştur", ur: "اکاؤنٹ بنائیں", hi: "खाता बनाएं" },
  getStarted: { en: "Get Started", es: "Comenzar", fr: "Commencer", de: "Loslegen", zh: "开始", tr: "Başla", ur: "شروع کریں", hi: "शुरू करें" },
  balance: { en: "Balance", es: "Saldo", fr: "Solde", de: "Guthaben", zh: "余额", tr: "Bakiye", ur: "بیلنس", hi: "शेष" },

  // Auth
  referralCode: { en: "Referral Code", es: "Código de referido", fr: "Code de parrainage", de: "Empfehlungscode", zh: "推荐码", tr: "Referans Kodu", ur: "ریفرل کوڈ", hi: "रेफरल कोड" },
  username: { en: "Username", es: "Usuario", fr: "Nom d'utilisateur", de: "Benutzername", zh: "用户名", tr: "Kullanıcı adı", ur: "صارف نام", hi: "उपयोगकर्ता नाम" },
  email: { en: "Email", es: "Correo", fr: "E-mail", de: "E-Mail", zh: "邮箱", tr: "E-posta", ur: "ای میل", hi: "ईमेल" },
  phone: { en: "Phone", es: "Teléfono", fr: "Téléphone", de: "Telefon", zh: "电话", tr: "Telefon", ur: "فون", hi: "फोन" },
  password: { en: "Password", es: "Contraseña", fr: "Mot de passe", de: "Passwort", zh: "密码", tr: "Şifre", ur: "پاس ورڈ", hi: "पासवर्ड" },

  // Wallet / Withdraw
  withdraw: { en: "Withdraw", es: "Retirar", fr: "Retirer", de: "Auszahlen", zh: "提现", tr: "Çek", ur: "واپس لیں", hi: "निकासी" },
  deposit: { en: "Deposit", es: "Depositar", fr: "Dépôt", de: "Einzahlen", zh: "充值", tr: "Yatır", ur: "جمع کریں", hi: "जमा" },
  amount: { en: "Amount", es: "Monto", fr: "Montant", de: "Betrag", zh: "金额", tr: "Tutar", ur: "رقم", hi: "राशि" },
  needAllTasks: { en: "Complete all 25 tasks today before withdrawing.", es: "Completa las 25 tareas de hoy antes de retirar.", fr: "Terminez les 25 tâches du jour avant de retirer.", de: "Erledige heute alle 25 Aufgaben vor der Auszahlung.", zh: "提现前请完成今日全部25项任务。", tr: "Çekmeden önce bugünün 25 görevini tamamla.", ur: "نکالنے سے پہلے آج کے تمام 25 ٹاسک مکمل کریں۔", hi: "निकासी से पहले आज के सभी 25 कार्य पूरे करें।" },

  // Tasks
  startTask: { en: "Start Task", es: "Iniciar tarea", fr: "Démarrer", de: "Aufgabe starten", zh: "开始任务", tr: "Göreve Başla", ur: "ٹاسک شروع کریں", hi: "कार्य शुरू करें" },
  completeTask: { en: "Complete Task", es: "Completar tarea", fr: "Terminer", de: "Aufgabe abschließen", zh: "完成任务", tr: "Görevi Tamamla", ur: "ٹاسک مکمل کریں", hi: "कार्य पूरा करें" },
  luckyOrder: { en: "Lucky Order!", es: "¡Orden Afortunada!", fr: "Commande Chanceuse !", de: "Glücksauftrag!", zh: "幸运订单!", tr: "Şanslı Sipariş!", ur: "لکی آرڈر!", hi: "लकी ऑर्डर!" },

  // Account
  myProfile: { en: "My Profile", es: "Mi perfil", fr: "Mon profil", de: "Mein Profil", zh: "我的资料", tr: "Profilim", ur: "میری پروفائل", hi: "मेरी प्रोफ़ाइल" },
  changePhoto: { en: "Change Photo", es: "Cambiar foto", fr: "Changer la photo", de: "Foto ändern", zh: "更换头像", tr: "Fotoğrafı Değiştir", ur: "تصویر تبدیل کریں", hi: "फ़ोटो बदलें" },
  language: { en: "Language", es: "Idioma", fr: "Langue", de: "Sprache", zh: "语言", tr: "Dil", ur: "زبان", hi: "भाषा" },
  changePassword: { en: "Change Password", es: "Cambiar contraseña", fr: "Changer le mot de passe", de: "Passwort ändern", zh: "修改密码", tr: "Şifreyi Değiştir", ur: "پاس ورڈ تبدیل کریں", hi: "पासवर्ड बदलें" },
  newPassword: { en: "New Password", es: "Nueva contraseña", fr: "Nouveau mot de passe", de: "Neues Passwort", zh: "新密码", tr: "Yeni Şifre", ur: "نیا پاس ورڈ", hi: "नया पासवर्ड" },
  confirm: { en: "Confirm", es: "Confirmar", fr: "Confirmer", de: "Bestätigen", zh: "确认", tr: "Onayla", ur: "تصدیق", hi: "पुष्टि करें" },
  save: { en: "Save", es: "Guardar", fr: "Enregistrer", de: "Speichern", zh: "保存", tr: "Kaydet", ur: "محفوظ کریں", hi: "सहेजें" },
  yourReferralCode: { en: "Your Referral Code", es: "Tu código de referido", fr: "Votre code de parrainage", de: "Dein Empfehlungscode", zh: "你的推荐码", tr: "Referans Kodun", ur: "آپ کا ریفرل کوڈ", hi: "आपका रेफरल कोड" },
  copy: { en: "Copy", es: "Copiar", fr: "Copier", de: "Kopieren", zh: "复制", tr: "Kopyala", ur: "کاپی", hi: "कॉपी" },
  copied: { en: "Copied!", es: "¡Copiado!", fr: "Copié !", de: "Kopiert!", zh: "已复制!", tr: "Kopyalandı!", ur: "کاپی ہو گیا!", hi: "कॉपी हो गया!" },
  info: { en: "Info", es: "Información", fr: "Infos", de: "Info", zh: "信息", tr: "Bilgi", ur: "معلومات", hi: "जानकारी" },
  displayName: { en: "Display Name", es: "Nombre", fr: "Nom affiché", de: "Anzeigename", zh: "显示名称", tr: "Görünen Ad", ur: "ڈسپلے نام", hi: "प्रदर्शन नाम" },
  vipLevel: { en: "VIP Level", es: "Nivel VIP", fr: "Niveau VIP", de: "VIP-Stufe", zh: "VIP 等级", tr: "VIP Seviyesi", ur: "وی آئی پی لیول", hi: "वीआईपी स्तर" },
  notVip: { en: "Not VIP", es: "Sin VIP", fr: "Pas VIP", de: "Kein VIP", zh: "非 VIP", tr: "VIP Değil", ur: "وی آئی پی نہیں", hi: "वीआईपी नहीं" },
  accountId: { en: "Account ID", es: "ID de cuenta", fr: "ID du compte", de: "Konto-ID", zh: "账户 ID", tr: "Hesap Kimliği", ur: "اکاؤنٹ آئی ڈی", hi: "खाता आईडी" },
  role: { en: "Role", es: "Rol", fr: "Rôle", de: "Rolle", zh: "角色", tr: "Rol", ur: "کردار", hi: "भूमिका" },
  shareReferralHint: { en: "Share this code so others can register under you.", es: "Comparte este código para que otros se registren contigo.", fr: "Partagez ce code pour inviter d'autres personnes.", de: "Teile diesen Code, damit sich andere unter dir registrieren.", zh: "分享此代码邀请他人注册。", tr: "Diğerlerinin altınıza kayıt olabilmesi için bu kodu paylaşın.", ur: "یہ کوڈ شیئر کریں تاکہ دوسرے آپ کے تحت رجسٹر ہو سکیں۔", hi: "इस कोड को साझा करें ताकि अन्य आपके अंतर्गत पंजीकरण कर सकें।" },

  // Dashboard
  welcomeBack: { en: "Welcome back", es: "Bienvenido de nuevo", fr: "Bon retour", de: "Willkommen zurück", zh: "欢迎回来", tr: "Tekrar hoş geldin", ur: "خوش آمدید", hi: "वापसी पर स्वागत है" },
  earningsOverview: { en: "Your earnings overview", es: "Resumen de ganancias", fr: "Aperçu de vos gains", de: "Übersicht deiner Einnahmen", zh: "您的收益概览", tr: "Kazanç özeti", ur: "آپ کی کمائی کا جائزہ", hi: "आपकी कमाई का अवलोकन" },
  totalEarned: { en: "Total Earned", es: "Total ganado", fr: "Total gagné", de: "Gesamtverdienst", zh: "总收益", tr: "Toplam Kazanç", ur: "کل کمائی", hi: "कुल अर्जित" },
  todaysTasks: { en: "Today's Tasks", es: "Tareas de hoy", fr: "Tâches du jour", de: "Heutige Aufgaben", zh: "今日任务", tr: "Bugünün Görevleri", ur: "آج کے ٹاسک", hi: "आज के कार्य" },
  dailyProgress: { en: "Daily Progress", es: "Progreso diario", fr: "Progression du jour", de: "Tagesfortschritt", zh: "每日进度", tr: "Günlük İlerleme", ur: "روزانہ پیش رفت", hi: "दैनिक प्रगति" },
  tasksCompleted: { en: "Tasks completed", es: "Tareas completadas", fr: "Tâches terminées", de: "Erledigte Aufgaben", zh: "已完成任务", tr: "Tamamlanan görevler", ur: "مکمل ٹاسک", hi: "पूर्ण कार्य" },
  perTask: { en: "Per task", es: "Por tarea", fr: "Par tâche", de: "Pro Aufgabe", zh: "每项任务", tr: "Görev başına", ur: "فی ٹاسک", hi: "प्रति कार्य" },
  dailyEstimate: { en: "Daily estimate", es: "Estimación diaria", fr: "Estimation du jour", de: "Tagesschätzung", zh: "每日预估", tr: "Günlük tahmin", ur: "روزانہ تخمینہ", hi: "दैनिक अनुमान" },
  startATask: { en: "Start a Task", es: "Iniciar una tarea", fr: "Démarrer une tâche", de: "Aufgabe starten", zh: "开始任务", tr: "Bir Göreve Başla", ur: "ٹاسک شروع کریں", hi: "कार्य शुरू करें" },
  vipStatus: { en: "VIP Status", es: "Estado VIP", fr: "Statut VIP", de: "VIP-Status", zh: "VIP 状态", tr: "VIP Durumu", ur: "وی آئی پی اسٹیٹس", hi: "वीआईपी स्थिति" },
  notVipMsg: { en: "You are not yet a VIP. Make a deposit and contact admin to be assigned a VIP level.", es: "Aún no eres VIP. Haz un depósito y contacta al admin para obtener un nivel VIP.", fr: "Vous n'êtes pas encore VIP. Effectuez un dépôt et contactez l'admin pour obtenir un niveau VIP.", de: "Du bist noch kein VIP. Mache eine Einzahlung und kontaktiere den Admin für eine VIP-Stufe.", zh: "您还不是 VIP。请充值并联系管理员获取 VIP 等级。", tr: "Henüz VIP değilsiniz. Yatırım yapın ve VIP seviyesi için yöneticiyle iletişime geçin.", ur: "آپ ابھی وی آئی پی نہیں ہیں۔ ڈپازٹ کریں اور وی آئی پی لیول کے لیے ایڈمن سے رابطہ کریں۔", hi: "आप अभी VIP नहीं हैं। जमा करें और VIP स्तर के लिए व्यवस्थापक से संपर्क करें।" },
  goWallet: { en: "Go to Wallet & Deposits", es: "Ir a billetera y depósitos", fr: "Aller au portefeuille et dépôts", de: "Zu Wallet & Einzahlungen", zh: "前往钱包与充值", tr: "Cüzdan ve Yatırımlar'a git", ur: "والیٹ اور ڈپازٹس پر جائیں", hi: "वॉलेट और जमा पर जाएं" },
  activeDeposit: { en: "Active deposit", es: "Depósito activo", fr: "Dépôt actif", de: "Aktive Einzahlung", zh: "有效充值", tr: "Aktif yatırım", ur: "فعال ڈپازٹ", hi: "सक्रिय जमा" },
  commissionRate: { en: "Commission rate", es: "Tasa de comisión", fr: "Taux de commission", de: "Provisionssatz", zh: "佣金率", tr: "Komisyon oranı", ur: "کمیشن ریٹ", hi: "कमीशन दर" },
  perTaskShort: { en: "/ task", es: "/ tarea", fr: "/ tâche", de: "/ Aufgabe", zh: "/ 任务", tr: "/ görev", ur: "/ ٹاسک", hi: "/ कार्य" },
  tasksPerDay: { en: "Tasks per day", es: "Tareas por día", fr: "Tâches par jour", de: "Aufgaben pro Tag", zh: "每日任务数", tr: "Günlük görevler", ur: "روزانہ ٹاسک", hi: "प्रति दिन कार्य" },
  withdrawalStatus: { en: "Withdrawal Status", es: "Estado de retiros", fr: "Statut des retraits", de: "Auszahlungsstatus", zh: "提现状态", tr: "Çekim Durumu", ur: "نکاسی اسٹیٹس", hi: "निकासी स्थिति" },
  viewAll: { en: "View All", es: "Ver todo", fr: "Voir tout", de: "Alle anzeigen", zh: "查看全部", tr: "Tümünü Gör", ur: "سب دیکھیں", hi: "सभी देखें" },
  noWithdrawals: { en: "No withdrawal requests yet. Complete 25 tasks today to unlock withdrawal.", es: "Aún no hay solicitudes de retiro. Completa 25 tareas hoy para desbloquear retiros.", fr: "Aucune demande de retrait. Terminez 25 tâches aujourd'hui pour débloquer les retraits.", de: "Noch keine Auszahlungsanfragen. Erledige heute 25 Aufgaben, um Auszahlungen freizuschalten.", zh: "暂无提现申请。完成今日25项任务以解锁提现。", tr: "Henüz çekim talebi yok. Çekim için bugün 25 görevi tamamla.", ur: "ابھی تک کوئی نکاسی درخواست نہیں۔ نکاسی کھولنے کے لیے آج 25 ٹاسک مکمل کریں۔", hi: "अभी तक कोई निकासी अनुरोध नहीं। निकासी अनलॉक करने के लिए आज 25 कार्य पूरे करें।" },
  requested: { en: "Requested", es: "Solicitado", fr: "Demandé", de: "Angefragt", zh: "已申请", tr: "İstendi", ur: "درخواست", hi: "अनुरोधित" },
  reviewed: { en: "Reviewed", es: "Revisado", fr: "Examiné", de: "Geprüft", zh: "已审核", tr: "İncelendi", ur: "جائزہ", hi: "समीक्षित" },
  net: { en: "net", es: "neto", fr: "net", de: "netto", zh: "净额", tr: "net", ur: "نیٹ", hi: "नेट" },
  legend: { en: "Status legend", es: "Leyenda de estado", fr: "Légende des statuts", de: "Status-Legende", zh: "状态说明", tr: "Durum Açıklaması", ur: "اسٹیٹس کی وضاحت", hi: "स्थिति सूची" },
  pending: { en: "Pending", es: "Pendiente", fr: "En attente", de: "Ausstehend", zh: "待处理", tr: "Beklemede", ur: "زیر التواء", hi: "लंबित" },
  approved: { en: "Approved", es: "Aprobado", fr: "Approuvé", de: "Genehmigt", zh: "已批准", tr: "Onaylandı", ur: "منظور", hi: "स्वीकृत" },
  rejected: { en: "Rejected", es: "Rechazado", fr: "Rejeté", de: "Abgelehnt", zh: "已拒绝", tr: "Reddedildi", ur: "مسترد", hi: "अस्वीकृत" },
  pendingDesc: { en: "Awaiting admin review", es: "En revisión por admin", fr: "En attente de validation", de: "Wartet auf Admin-Prüfung", zh: "等待管理员审核", tr: "Yönetici incelemesinde", ur: "ایڈمن جائزہ کا انتظار", hi: "व्यवस्थापक समीक्षा प्रतीक्षित" },
  approvedDesc: { en: "Funds sent to your wallet", es: "Fondos enviados a tu billetera", fr: "Fonds envoyés à votre portefeuille", de: "Geld an deine Wallet gesendet", zh: "资金已发送至您的钱包", tr: "Fonlar cüzdanınıza gönderildi", ur: "رقم آپ کے والیٹ میں بھیج دی گئی", hi: "धनराशि आपके वॉलेट में भेजी गई" },
  rejectedDesc: { en: "Returned to balance — see notes", es: "Devuelto al saldo — ver notas", fr: "Remboursé au solde — voir les notes", de: "Zurück ins Guthaben — Hinweise prüfen", zh: "已退回余额 - 请查看备注", tr: "Bakiyeye iade edildi — notlara bakın", ur: "بیلنس میں واپس - نوٹس دیکھیں", hi: "शेष में लौटा - नोट देखें" },
};

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: keyof typeof dict) => string } | undefined>(undefined);

export function LangProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === "undefined") return "en";
    const stored = localStorage.getItem("lang") as Lang | null;
    if (stored && LANGUAGES.some(l => l.code === stored)) return stored;
    return "en";
  });

  useEffect(() => {
    const pl = profile?.language as Lang | undefined;
    if (pl && LANGUAGES.some(l => l.code === pl) && pl !== lang) setLangState(pl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.language]);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("lang", l);
    if (user) supabase.from("profiles").update({ language: l }).eq("id", user.id).then();
  };

  const t = (k: keyof typeof dict) => {
    const entry = dict[k];
    if (!entry) return String(k);
    return entry[lang] ?? entry.en ?? String(k);
  };

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useLang() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useLang must be used within LangProvider");
  return c;
}
