const Placeholder = ({ title }: { title: string }) => {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-card border border-border rounded-card p-8 text-center max-w-sm w-full shadow-soft">
        <h1 className="text-xl font-bold text-gold mb-2">{title}</h1>
        <p className="text-muted-foreground text-sm">Em construção — chega na Fase 3/4</p>
      </div>
    </div>
  );
};

export default Placeholder;
