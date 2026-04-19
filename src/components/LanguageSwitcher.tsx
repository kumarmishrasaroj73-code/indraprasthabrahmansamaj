import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LANGUAGES } from "@/i18n/languages";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const current = LANGUAGES.find((l) => l.code === i18n.language) ?? LANGUAGES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 border-accent/40">
          <Globe className="h-4 w-4 text-primary" />
          <span className="hidden sm:inline">{current.native}</span>
          <span className="sm:hidden text-xs">{current.code.toUpperCase()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-[60vh] overflow-y-auto w-56 bg-popover">
        <DropdownMenuLabel>Choose Language / भाषा</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => i18n.changeLanguage(lang.code)}
            className={`cursor-pointer flex justify-between ${
              i18n.language === lang.code ? "bg-accent/20 font-semibold" : ""
            }`}
          >
            <span>{lang.native}</span>
            <span className="text-xs text-muted-foreground">{lang.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
