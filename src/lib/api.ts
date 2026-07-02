import { supabase } from "@/integrations/supabase/client";

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export async function adminRequest(action: string, table: string, data?: any, id?: string, filters?: any, password?: string) {
  const res = await fetch(`${FUNCTIONS_URL}/admin-operations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-password': password || '',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ action, table, data, id, filters }),
  });
  
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export async function generateCertificateText(params: {
  participantName?: string;
  workshopTitle: string;
  workshopDate: string;
  workshopDescription?: string;
  presenterName: string;
  presenterNames?: string[];
  signerName: string;
  companyName: string;
  companyLogoUrl?: string;
  type: 'participant' | 'presenter';
}) {
  const res = await fetch(`${FUNCTIONS_URL}/generate-certificate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify(params),
  });
  
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Certificate generation failed');
  }
  return res.json();
}

// Public read operations using supabase client directly
export async function getWorkshops() {
  const presenterCols = 'id, name, title, bio, photo_url, signature_url, created_at';
  const { data, error } = await supabase
    .from('workshops')
    .select(`*, presenters:presenter_id(${presenterCols}), workshop_presenters(presenter_id, presenters(${presenterCols}))`)
    .order('date', { ascending: true });
  if (error) throw error;
  return data;
}

export async function getWorkshop(id: string) {
  const presenterCols = 'id, name, title, bio, photo_url, signature_url, created_at';
  const { data, error } = await supabase
    .from('workshops')
    .select(`*, presenters:presenter_id(${presenterCols}), workshop_presenters(presenter_id, presenters(${presenterCols}))`)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}


export async function getWorkshopPresenters(workshopId: string) {
  const presenterCols = 'id, name, title, bio, photo_url, signature_url, created_at';
  const { data, error } = await supabase
    .from('workshop_presenters')
    .select(`*, presenters(${presenterCols})`)
    .eq('workshop_id', workshopId);
  if (error) throw error;
  return data;
}


export async function getWorkshopVideos(workshopId: string) {
  const { data, error } = await supabase
    .from('workshop_videos')
    .select('*')
    .eq('workshop_id', workshopId)
    .order('created_at');
  if (error) throw error;
  return data;
}

export async function getWorkshopMaterials(workshopId: string) {
  const { data, error } = await supabase
    .from('workshop_materials')
    .select('*')
    .eq('workshop_id', workshopId)
    .order('created_at');
  if (error) throw error;
  return data;
}

export async function getWorkshopLessons(workshopId: string) {
  const { data, error } = await supabase
    .from('workshop_lessons')
    .select('*')
    .eq('workshop_id', workshopId)
    .order('order_index', { ascending: true });
  if (error) throw error;
  return data;
}

export async function getCourses() {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .order('order_index', { ascending: true });
  if (error) throw error;
  return data;
}

export async function getCourse(id: string) {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function getCourseLessons(courseId: string) {
  const { data, error } = await supabase
    .from('workshop_lessons')
    .select('*')
    .eq('course_id', courseId)
    .order('order_index', { ascending: true });
  if (error) throw error;
  return data;
}

export async function getLessonCompletions(workshopId: string, email: string) {
  const { data, error } = await supabase
    .from('lesson_completions')
    .select('*')
    .eq('workshop_id', workshopId)
    .eq('email', email.toLowerCase());
  if (error) throw error;
  return data;
}

export async function getCourseLessonCompletions(courseId: string, email: string) {
  const { data, error } = await supabase
    .from('lesson_completions')
    .select('*')
    .eq('course_id', courseId)
    .eq('email', email.toLowerCase());
  if (error) throw error;
  return data;
}

export async function markLessonComplete(lessonId: string, workshopId: string, email: string) {
  const { data, error } = await supabase
    .from('lesson_completions')
    .insert({ lesson_id: lessonId, workshop_id: workshopId, email: email.toLowerCase() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function markCourseLessonComplete(lessonId: string, courseId: string, email: string) {
  const { data, error } = await supabase
    .from('lesson_completions')
    .insert({ lesson_id: lessonId, course_id: courseId, email: email.toLowerCase() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function unmarkLessonComplete(lessonId: string, email: string) {
  const { error } = await supabase.rpc('unmark_lesson_completion', {
    p_lesson_id: lessonId,
    p_email: email.toLowerCase(),
  });
  if (error) throw error;
}


export async function getWorkshopParticipants(workshopId: string) {
  const { data, error } = await supabase
    .from('workshop_participants')
    .select('*')
    .eq('workshop_id', workshopId)
    .order('registered_at');
  if (error) throw error;
  return data;
}

export async function registerForWorkshop(workshopId: string, fullName: string, email: string) {
  const { data, error } = await supabase
    .from('workshop_participants')
    .insert({ workshop_id: workshopId, full_name: fullName, email })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getCompanySettings() {
  const { data, error } = await supabase
    .from('company_settings')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getPresenters() {
  // Email column is intentionally excluded from the public Data API surface
  // (column-level GRANT). Admin code reads it via the admin-operations edge function.
  const { data, error } = await supabase
    .from('presenters')
    .select('id, name, title, bio, photo_url, signature_url, created_at')
    .order('name');
  if (error) throw error;
  return data;
}

export function getStorageUrl(path: string) {
  const { data } = supabase.storage.from('workshop-assets').getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadFile(file: File, folder: string) {
  const fileName = `${folder}/${Date.now()}-${file.name}`;
  const { data, error } = await supabase.storage
    .from('workshop-assets')
    .upload(fileName, file);
  if (error) throw error;
  return getStorageUrl(data.path);
}

export async function saveCertificateVerification(params: {
  verificationCode: string;
  participantName: string;
  workshopId: string;
  workshopTitle: string;
  workshopDate: string;
  certificateType: string;
  companyName: string;
}) {
  const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
  const res = await fetch(`${FUNCTIONS_URL}/admin-operations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({
      action: 'insert',
      table: 'certificate_verifications',
      data: {
        verification_code: params.verificationCode,
        participant_name: params.participantName,
        workshop_id: params.workshopId,
        workshop_title: params.workshopTitle,
        workshop_date: params.workshopDate,
        certificate_type: params.certificateType,
        company_name: params.companyName,
      },
    }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Verification save failed');
  }
  return res.json();
}

export async function verifyCertificate(code: string) {
  const { data, error } = await supabase
    .from('certificate_verifications')
    .select('*')
    .eq('verification_code', code)
    .single();
  if (error) throw error;
  return data;
}
