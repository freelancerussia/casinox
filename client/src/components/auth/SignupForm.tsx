import { useContext, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AuthContext, type AuthContextType } from '@/App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { signInWithGoogle } from '@/lib/firebase';
import { apiRequest } from '@/lib/queryClient';
import { FaGoogle } from 'react-icons/fa';
import { insertUserSchema } from '@shared/schema';

const formSchema = insertUserSchema.extend({
  confirmPassword: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  termsAccepted: z.boolean().refine(val => val === true, {
    message: "You must accept the terms and conditions.",
  })
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

type SignupFormValues = z.infer<typeof formSchema>;

export default function SignupForm() {
  const { login } = useContext(AuthContext) as AuthContextType;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      termsAccepted: false
    }
  });

  const onSubmit = async (data: SignupFormValues) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Set avatar initial based on username
      const avatarInitial = data.username.charAt(0).toUpperCase();
      
      const response = await apiRequest('POST', '/api/auth/register', {
        username: data.username,
        email: data.email,
        password: data.password,
        avatarInitial
      });
      
      const result = await response.json();
      
      if (result.token && result.user) {
        login(result.token, result.user);
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const googleResult = await signInWithGoogle();
      
      if (googleResult.success && googleResult.user) {
        // Register the user on your backend using Firebase credentials
        const response = await apiRequest('POST', '/api/auth/firebase-register', {
          email: googleResult.user.email,
          displayName: googleResult.user.displayName,
          firebaseUid: googleResult.user.uid
        });
        
        const result = await response.json();
        
        if (result.token && result.user) {
          login(result.token, result.user);
        }
      } else {
        throw new Error(googleResult.error || 'Google sign up failed');
      }
    } catch (err) {
      setError(err.message || 'Failed to sign up with Google.');
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
                    placeholder="Choose a username" 
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
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-400">Email</FormLabel>
                <FormControl>
                  <Input 
                    type="email" 
                    placeholder="you@example.com" 
                    {...field} 
                    className="bg-primary-dark border-gray-700 text-white"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-400">Confirm Password</FormLabel>
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
          </div>
          
          <FormField
            control={form.control}
            name="termsAccepted"
            render={({ field }) => (
              <FormItem className="flex items-start space-x-2">
                <FormControl>
                  <Checkbox 
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="bg-primary-dark border-gray-700 mt-1"
                  />
                </FormControl>
                <div className="text-sm text-gray-400">
                  I accept the <a href="#" className="text-accent hover:text-accent-light">Terms of Service</a> and <a href="#" className="text-accent hover:text-accent-light">Privacy Policy</a>
                </div>
              </FormItem>
            )}
          />
          
          <Button 
            type="submit" 
            className="w-full bg-accent hover:bg-accent-light"
            disabled={isLoading}
          >
            {isLoading ? 'Creating account...' : 'Create Account'}
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
        onClick={handleGoogleSignup}
        disabled={isLoading}
      >
        <FaGoogle className="mr-2" /> Google
      </Button>
    </div>
  );
}
