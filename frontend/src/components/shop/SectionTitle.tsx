interface SectionTitleProps {
  children: React.ReactNode;
  className?: string;
}

const SectionTitle = ({ children, className = "" }: SectionTitleProps) => {
  return (
    <h2 className={`font-display text-xl md:text-2xl font-bold text-center text-foreground ${className}`}>
      {children}
    </h2>
  );
};

export default SectionTitle;
