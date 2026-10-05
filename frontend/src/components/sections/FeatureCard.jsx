"use client";

import { motion } from "framer-motion";

export default function FeatureCard({ feature, index }) {
  const Icon = feature.icon;

  return (
    <motion.div
      custom={index}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: (i) => ({
          opacity: 1,
          y: 0,
          transition: { delay: i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
        }),
      }}
    >
      <div className="group flex h-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left shadow-2xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary transition-transform duration-300 group-hover:scale-110 border border-border">
          <Icon className="size-6 text-primary" strokeWidth={2} />
        </div>

        <div>
          <h3 className="text-sm font-extrabold text-foreground">
            {feature.title}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
            {feature.description}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
