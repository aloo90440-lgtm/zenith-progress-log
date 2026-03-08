import { useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const Landing = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen gradient-desert flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden" dir="rtl">
      {/* Dust particles */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-2 h-2 rounded-full bg-primary/20 animate-dust" />
        <div className="absolute top-1/3 left-1/3 w-1.5 h-1.5 rounded-full bg-accent/20 animate-dust-slow" />
        <div className="absolute bottom-1/4 right-1/3 w-1 h-1 rounded-full bg-dust/30 animate-dust" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center relative z-10"
      >
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-dust text-sm tracking-[0.3em] uppercase mb-4 font-sans-ui"
        >
          رحلة الانضباط
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="font-serif-display text-5xl sm:text-6xl font-bold text-foreground mb-4"
        >
          الرحلة
        </motion.h1>

        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.7, duration: 0.4 }}
          className="w-16 h-px bg-primary/40 mx-auto mb-6"
        />

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.6 }}
          className="text-muted-foreground text-lg max-w-md mx-auto mb-12 leading-relaxed"
        >
          ابدأ بناء كيان صلب لا يُكسر... بالمتابعة يومًا بعد يوم
        </motion.p>

        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.4 }}
          onClick={() => navigate("/auth")}
          className="gradient-sand text-primary-foreground font-sans-ui font-medium px-10 py-4 rounded-lg text-base hover:opacity-90 transition-opacity shadow-sand"
        >
          ابدأ رحلتك
        </motion.button>
      </motion.div>
    </div>
  );
};

export default Landing;
