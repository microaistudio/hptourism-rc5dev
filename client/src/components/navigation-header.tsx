import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import himachalTourismLogo from "@assets/WhatsApp Image 2025-10-25 at 07.59.16_5c0e8739_1761362811579.jpg";

interface NavigationHeaderProps {
  title?: string;
  subtitle?: string;
  showHome?: boolean;
  showBack?: boolean;
  backTo?: string;
  actions?: React.ReactNode;
  onPrimaryLogoToggle?: () => void;
  onBack?: () => void;
}

export function NavigationHeader({ 
  title, 
  subtitle,
  showHome = true, 
  showBack = true, 
  backTo,
  actions,
  onPrimaryLogoToggle,
  onBack,
}: NavigationHeaderProps) {
  const [, setLocation] = useLocation();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (backTo) {
      setLocation(backTo);
    } else {
      window.history.back();
    }
  };

  return (
    <div className="border-b bg-background sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-1 min-w-0 items-center gap-3">
            {showBack && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                data-testid="button-back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            {showHome && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/")}
                data-testid="button-home"
              >
                <Home className="h-5 w-5" />
              </Button>
            )}
            {title && (
              <div className="flex items-center gap-3 min-w-0">
                {onPrimaryLogoToggle ? (
                  <button
                    type="button"
                    onClick={onPrimaryLogoToggle}
                    className="relative p-0 border-none bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
                    aria-label="Toggle alternate hero image"
                  >
                    <img 
                      src={himachalTourismLogo} 
                      alt="Himachal Tourism" 
                      className="h-12 w-auto object-contain"
                      data-testid="img-hp-tourism-logo"
                    />
                  </button>
                ) : (
                  <img 
                    src={himachalTourismLogo} 
                    alt="Himachal Tourism" 
                    className="h-12 w-auto object-contain"
                    data-testid="img-hp-tourism-logo"
                  />
                )}
                <div className="border-l h-12 border-border"></div>
                <div className="min-w-0">
                  <h1 className="text-lg font-semibold leading-tight truncate" data-testid="text-page-title">
                    {title}
                  </h1>
                  {subtitle && (
                    <p className="text-sm text-muted-foreground leading-tight truncate" data-testid="text-page-subtitle">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
          {actions && (
            <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
