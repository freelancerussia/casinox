import { useContext, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AuthContext, type AuthContextType } from '@/App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { signInWithGoogle } from '@/lib/firebase';
import { apiRequest } from '@/lib/queryClient';
import { FaGoogle } from 'react-icons/fa';
import { loginUserSchema } from '@shared/schema';

const formSchema = loginUserSchema.extend({
  rememberMe: z.boolean().optional()
});

type LoginFormValues = z.infer<typeof formSchema>;

export default function LoginForm() {
  const { login } = useContext(AuthContext) as AuthContextType;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      password: '',
      rememberMe: false
    }
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiRequest('POST', '/api/auth/login', {
        username: data.username,
        password: data.password
      });
      
      const result = await response.json();
      
      if (result.token && result.user) {
        login(result.token, result.user);
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const googleResult = await signInWithGoogle();
      
      if (googleResult.success && googleResult.user) {
        // Register or login the user on your backend using Firebase credentials
        const response = await apiRequest('POST', '/api/auth/firebase-login', {
          email: googleResult.user.email,
          displayName: googleResult.user.displayName,
          firebaseUid: googleResult.user.uid
        });
        
        const result = await response.json();
        
        if (result.token && result.user) {
          login(result.token, result.user);
        }
      } else {
        throw new Error(googleResult.error || 'Google sign in failed');
      }
    } catch (err) {
      setError(err.message || 'Failed to login with Google.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 py-2 pb-4">
      {error && (
        <div className="bg-red-500 bg-opacity-20 text-red-500 p-3 rounded-md text-sm mb-4">
          {error}
        </div>
      )}
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-400">Username</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Username" 
                    {...field} 
                    className="bg-primary-dark border-gray-700 text-white"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-400">Password</FormLabel>
                <FormControl>
                  <Input 
                    type="password" 
                    placeholder="••••••••" 
                    {...field} 
                    className="bg-primary-dark border-gray-700 text-white"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FormField
                control={form.control}
                name="rememberMe"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Checkbox 
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="bg-primary-dark border-gray-700"
                      />
                    </FormControl>
                    <label 
                      htmlFor="rememberMe" 
                      className="text-sm font-medium text-gray-400 cursor-pointer"
                    >
                      Remember me
                    </label>
                  </FormItem>
                )}
              />
            </div>
            <a href="#" className="text-sm text-accent hover:text-accent-light">
              Forgot password?
            </a>
          </div>
          
          <Button 
            type="submit" 
            className="w-full bg-accent hover:bg-accent-light"
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>
        </form>
      </Form>
      
      <div className="relative flex items-center justify-center mt-6">
        <div className="border-t border-gray-800 w-full absolute"></div>
        <div className="bg-primary px-4 relative z-10 text-sm text-gray-400">or continue with</div>
      </div>
      
      <Button 
        type="button"
        variant="outline"
        className="w-full bg-primary-dark hover:bg-primary-light text-white border-gray-700"
        onClick={handleGoogleLogin}
        disabled={isLoading}
      >
        <FaGoogle className="mr-2" /> Google
      </Button>
    </div>
  );
}
