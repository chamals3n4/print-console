// Title block at the top of each tool page
function PageHeader({ title, description }) {
  return (
    <div>
      <h1 className="text-base font-semibold text-neutral-900 tracking-tight">
        {title}
      </h1>
      <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">
        {description}
      </p>
    </div>
  );
}

export default PageHeader;
