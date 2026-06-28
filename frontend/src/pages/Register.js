import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PasswordField from '../components/shared/PasswordField';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) return setError('Password must be at least 6 characters');
    setLoading(true);
    try {
      await register(form.username, form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-paper dark:bg-dusk grain relative">
      <div className="w-full max-w-sm bg-white dark:bg-dusk-raised border border-mist dark:border-dusk-line rounded-xl2 p-10 shadow-card dark:shadow-card-dark relative z-10">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex w-14 h-14 rounded-full border-2 border-signal items-center justify-center text-signal font-display font-bold text-xl rotate-[-6deg] mb-4">
            M
          </Link>
          <h1 className="text-xl font-display font-semibold text-ink dark:text-paper">Create your account</h1>
          <p className="text-sm text-ink/45 dark:text-paper/40 mt-1">Join ModeraAI in seconds</p>
        </div>

        {error && (
          <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-300 px-4 py-2.5 rounded-xl text-sm mb-5">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-input"
              placeholder="johndoe"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
              minLength={3}
            />
          </div>
          <div>
            <label className="form-label">Email address</label>
            <input
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="form-label" htmlFor="register-password">Password</label>
            <PasswordField
              id="register-password"
              placeholder="Min. 6 characters"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={6}
            />
          </div>
          <button type="submit" className="btn-primary btn-lg w-full justify-center" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-sm text-ink/45 dark:text-paper/40 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-signal font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
