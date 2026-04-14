import { Toaster as Sonner, toast } from "sonner";
import { useThemeMode } from "@/components/ThemeContext";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { resolved } = useThemeMode();

  return (
    <Sonner
      theme={resolved as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-surface-1 group-[.toaster]:text-text-1 group-[.toaster]:border-surface-3 group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-text-2",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-surface-3 group-[.toast]:text-text-2",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
