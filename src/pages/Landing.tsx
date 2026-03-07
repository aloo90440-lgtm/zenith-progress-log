import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen gradient-desert relative overflow-hidden flex flex-col">
      {/* Dust particles */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 rounded-full bg-primary/20 animate-dust" />
        <div className="absolute top-1/3 right-1/3 w-1.5 h-1.5 rounded-full bg-primary/15 animate-dust-slow" />
        <div className="absolute bottom-1/3 left-1/2 w-1 h-1 rounded-full bg-primary/20 animate-dust" style={{ animationDelay: '3s' }} />
        <div className="absolute top-2/3 right-1/4 w-2 h-2 rounded-full bg-dust/30 animate-dust-slow" style={{ animationDelay: '5s' }} />
      </div>

      {/* Subtle gradient overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-background/80 to-transparent pointer-events-none" />

      <div className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            <p className="text-dust text-sm tracking-[0.3em] uppercase mb-6 font-sans-ui">
              A personal discipline tracker
            </p>
            <h1 className="font-serif-display text-5xl sm:text-6xl md:text-7xl font-semibold text-foreground mb-6 leading-tight">
              The Journey
            </h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
          >
            <div className="w-16 h-px bg-primary/40 mx-auto mb-8" />
            <p className="text-muted-foreground text-lg sm:text-xl leading-relaxed mb-4 max-w-lg mx-auto">
              Everyone has a journey toward a goal. Progress is made daily through discipline.
            </p>
            <p className="text-dust text-base mb-12 max-w-md mx-auto">
              Consistency matters more than perfection. Track your path, one step at a time.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            <button
              onClick={() => navigate("/setup")}
              className="gradient-sand text-primary-foreground font-sans-ui font-medium px-10 py-4 rounded-lg text-base tracking-wide hover:opacity-90 transition-opacity shadow-sand"
            >
              Start Your Journey
            </button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.4 }}
            className="mt-16 text-dust/60 text-xs tracking-widest uppercase"
          >
            The desert rewards those who persist
          </motion.p>
        </div>
      </div>
    </div>
  );
};

export default Landing;
