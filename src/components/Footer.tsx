export function Footer() {
  return (
    <footer className="pt-10 text-center text-xs text-muted-foreground">
      <span suppressHydrationWarning>
        © {new Date().getFullYear()} Presento — Built by Midhun Jose and Adarsh R
      </span>
    </footer>
  );
}
