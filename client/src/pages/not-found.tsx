import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-primary p-4">
      <Card className="w-full max-w-md bg-secondary border-neutral-border">
        <CardContent className="pt-6 flex flex-col items-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          
          <h1 className="text-2xl font-bold text-white mb-2">404 - Page Not Found</h1>
          
          <p className="mt-2 text-neutral-400 text-center mb-6">
            The page you're looking for doesn't exist or has been moved.
          </p>
          
          <Button 
            className="bg-purple-500 hover:bg-purple-600 text-white" 
            onClick={() => setLocation("/")}
          >
            Return to Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
