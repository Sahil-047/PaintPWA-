interface PageTitleProps {
  title: string;
  description?: string;
}

export default function PageTitle({ title, description }: PageTitleProps) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{title}</h1>
      {description && <p className="text-slate-600 mt-2 text-sm lg:text-base">{description}</p>}
    </div>
  );
}
