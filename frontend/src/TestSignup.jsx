import { supabase } from './supabaseClient';

export default function TestSignup() {
  async function handleClick() {
    const { data, error } = await supabase.auth.signUp({
      email: 'test@example.com',
      password: 'password123',
    });

    // Log the result so you can see what Supabase returns
    console.log('Signup result:', data);
    console.error('Signup error:', error);
  }

  return (
    <button onClick={handleClick}>
      Test Signup
    </button>
  );
}
