import { useState } from 'react';
import { motion } from 'framer-motion';
import { User as UserIcon, Phone, Mail, LogIn, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getUsers, saveUser, setCurrentUser, type User } from '@/lib/store';
import { toast } from 'sonner';

interface AuthPageProps {
  onLogin: (user: User) => void;
}

export default function AuthPage({ onLogin }: AuthPageProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const handleRegister = () => {
    if (!name.trim() || !phone.trim()) {
      toast.error('يرجى إدخال الاسم ورقم الهاتف');
      return;
    }
    const existing = getUsers().find(u => u.phone === phone);
    if (existing) {
      toast.error('رقم الهاتف مسجل بالفعل');
      return;
    }
    const user: User = {
      id: crypto.randomUUID(),
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      registeredAt: new Date().toISOString().split('T')[0],
    };
    saveUser(user);
    setCurrentUser(user.id);
    toast.success('تم التسجيل بنجاح!');
    onLogin(user);
  };

  const handleLogin = () => {
    if (!phone.trim()) {
      toast.error('يرجى إدخال رقم الهاتف');
      return;
    }
    const user = getUsers().find(u => u.phone === phone.trim());
    if (!user) {
      toast.error('لم يتم العثور على حساب بهذا الرقم');
      return;
    }
    setCurrentUser(user.id);
    toast.success(`مرحبًا ${user.name}!`);
    onLogin(user);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-hero">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-card/20 backdrop-blur-sm mb-4"
          >
            <span className="text-4xl">🎯</span>
          </motion.div>
          <h1 className="text-3xl font-bold text-primary-foreground">متابعة الأداء</h1>
          <p className="text-primary-foreground/80 mt-2">نظام متابعة الأداء الشخصي اليومي</p>
        </div>

        <Card className="shadow-elevated border-0">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">
              {isRegister ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isRegister && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2">
                <Label htmlFor="name">الاسم الكامل</Label>
                <div className="relative">
                  <UserIcon className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="أدخل اسمك" className="pr-10" />
                </div>
              </motion.div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="phone">رقم الهاتف</Label>
              <div className="relative">
                <Phone className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="05xxxxxxxx" className="pr-10" dir="ltr" />
              </div>
            </div>

            {isRegister && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني (اختياري)</Label>
                <div className="relative">
                  <Mail className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" className="pr-10" dir="ltr" />
                </div>
              </motion.div>
            )}

            <Button
              onClick={isRegister ? handleRegister : handleLogin}
              className="w-full gradient-primary text-primary-foreground hover:opacity-90 transition-opacity"
              size="lg"
            >
              {isRegister ? (
                <><UserPlus className="ml-2 h-5 w-5" /> إنشاء حساب</>
              ) : (
                <><LogIn className="ml-2 h-5 w-5" /> دخول</>
              )}
            </Button>

            <div className="text-center">
              <button
                onClick={() => setIsRegister(!isRegister)}
                className="text-sm text-primary hover:underline"
              >
                {isRegister ? 'لديك حساب؟ سجل دخولك' : 'ليس لديك حساب؟ سجل الآن'}
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
