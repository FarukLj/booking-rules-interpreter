import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { LogIn, Shield, User, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Navbar() {
  const { user, isAdmin, signOut } = useAuth();

  return (
    <nav className="bg-white shadow-sm border-b border-slate-200">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <Link to="/" className="text-xl font-bold text-slate-800">
            AI Booking Rules
          </Link>
          
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <span className="text-sm text-slate-600 hidden md:block">
                  {user.email}
                </span>
                {isAdmin && (
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/admin">
                      <Shield className="w-4 h-4 mr-2" />
                      Admin
                    </Link>
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={signOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </>
            ) : (
              // Hidden sign in button - keeping the space but making it invisible
              <div className="opacity-0 pointer-events-none">
                <Button variant="outline" size="sm" asChild>
                  <Link to="/auth">
                    <LogIn className="w-4 h-4 mr-2" />
                    Sign In
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
