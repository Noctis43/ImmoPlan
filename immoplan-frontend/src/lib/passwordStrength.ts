export type PasswordStrengthLevel = 'low' | 'medium' | 'strong';

export interface PasswordStrengthResult {
  score: number;
  level: PasswordStrengthLevel;
  color: string;
  label: string;
  canSubmit: boolean;
}

export function getPasswordStrength(password: string): PasswordStrengthResult {
  let score = 0;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) {
    return {
      score,
      level: 'low',
      color: '#FF4D4D',
      label: 'Faible',
      canSubmit: false,
    };
  }
  if (score <= 4) {
    return {
      score,
      level: 'medium',
      color: '#22C55E',
      label: 'Moyen',
      canSubmit: true,
    };
  }
  return {
    score,
    level: 'strong',
    color: '#16A34A',
    label: 'Fort',
    canSubmit: true,
  };
}
