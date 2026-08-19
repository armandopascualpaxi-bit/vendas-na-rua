const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://efcwrgtyypkzjstiidfl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmY3dyZ3R5eXBrempzdGlpZGZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njk5NDEyNCwiZXhwIjoyMTAyNTcwMTI0fQ.Mh7ACcvuxA9qX05NjPRhDIS2RxrNqEmT7vd209ES3ms'
)

async function resetPassword() {
  const { data, error } = await supabase.auth.admin.updateUserById(
    '0b05ce6a-63fb-484a-84a5-6eba1648e06f',
    { password: 'Armexa2026!' }
  )
  if (error) {
    console.error('Erro:', error)
  } else {
    console.log('Senha atualizada com sucesso:', data)
  }
}

resetPassword()
