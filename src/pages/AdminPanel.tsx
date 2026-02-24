import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Edit2, Save, X, Upload, Video, FileText, Users, Settings, Award, LogOut, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { adminRequest, uploadFile, getPresenters, getCompanySettings, getWorkshopParticipants } from '@/lib/api';
import { generateCertificateText } from '@/lib/api';
import { generateCertificatePDF } from '@/lib/certificate';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

type Tab = 'workshops' | 'presenters' | 'settings';

const AdminPanel = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [adminPwd, setAdminPwd] = useState('');
  const [tab, setTab] = useState<Tab>('workshops');
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogin = () => {
    if (password === 'Wildlifeuk2026') {
      setAuthenticated(true);
      setAdminPwd(password);
    } else {
      toast({ title: 'Wrong password', variant: 'destructive' });
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card border border-border rounded-xl p-8 w-full max-w-sm shadow-forest">
          <h2 className="text-xl font-display font-bold text-foreground mb-2 text-center">Admin Access</h2>
          <p className="text-sm text-muted-foreground mb-6 text-center">Enter admin password to continue</p>
          <Input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} className="mb-4" />
          <Button onClick={handleLogin} className="w-full bg-primary text-primary-foreground">Enter</Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground px-6 py-4 flex items-center justify-between">
        <h1 className="font-display font-bold text-lg">Admin Panel</h1>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 gap-1">
            <Eye className="w-4 h-4" /> View Site
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setAuthenticated(false)} className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 gap-1">
            <LogOut className="w-4 h-4" /> Logout
          </Button>
        </div>
      </header>

      <div className="flex border-b border-border bg-card">
        {(['workshops', 'presenters', 'settings'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-6 py-3 text-sm font-medium capitalize transition-colors ${tab === t ? 'border-b-2 border-accent text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {tab === 'workshops' && <WorkshopsTab adminPwd={adminPwd} />}
        {tab === 'presenters' && <PresentersTab adminPwd={adminPwd} />}
        {tab === 'settings' && <SettingsTab adminPwd={adminPwd} />}
      </div>
    </div>
  );
};

function WorkshopsTab({ adminPwd }: { adminPwd: string }) {
  const { toast } = useToast();
  const [workshops, setWorkshops] = useState<any[]>([]);
  const [presenters, setPresenters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', description: '', date: '', duration_minutes: 60, location: '', presenter_id: '', max_participants: '' });
  const [selectedWorkshop, setSelectedWorkshop] = useState<string | null>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [company, setCompany] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ws, ps, cs] = await Promise.all([
        adminRequest('list', 'workshops', undefined, undefined, { order: { column: 'date', ascending: false } }, adminPwd),
        getPresenters(),
        getCompanySettings(),
      ]);
      setWorkshops(ws || []);
      setPresenters(ps || []);
      setCompany(cs);
    } catch (e: any) {
      toast({ title: 'Load failed', description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  }, [adminPwd, toast]);

  useEffect(() => { load(); }, [load]);

  const loadWorkshopDetails = async (wsId: string) => {
    setSelectedWorkshop(wsId);
    try {
      const [v, m, p] = await Promise.all([
        adminRequest('list', 'workshop_videos', undefined, undefined, { select: '*', order: { column: 'created_at', ascending: true } }, adminPwd),
        adminRequest('list', 'workshop_materials', undefined, undefined, { select: '*', order: { column: 'created_at', ascending: true } }, adminPwd),
        getWorkshopParticipants(wsId),
      ]);
      setVideos((v || []).filter((x: any) => x.workshop_id === wsId));
      setMaterials((m || []).filter((x: any) => x.workshop_id === wsId));
      setParticipants(p || []);
    } catch (e: any) {
      toast({ title: 'Load details failed', variant: 'destructive' });
    }
  };

  const saveWorkshop = async () => {
    try {
      const data = {
        ...form,
        duration_minutes: Number(form.duration_minutes),
        max_participants: form.max_participants ? Number(form.max_participants) : null,
        presenter_id: form.presenter_id || null,
      };
      if (editId) {
        await adminRequest('update', 'workshops', data, editId, undefined, adminPwd);
      } else {
        await adminRequest('insert', 'workshops', data, undefined, undefined, adminPwd);
      }
      toast({ title: editId ? 'Workshop updated' : 'Workshop created' });
      setShowForm(false);
      setEditId(null);
      setForm({ title: '', description: '', date: '', duration_minutes: 60, location: '', presenter_id: '', max_participants: '' });
      load();
    } catch (e: any) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
    }
  };

  const deleteWorkshop = async (id: string) => {
    if (!confirm('Delete this workshop?')) return;
    try {
      await adminRequest('delete', 'workshops', undefined, id, undefined, adminPwd);
      toast({ title: 'Deleted' });
      load();
      if (selectedWorkshop === id) setSelectedWorkshop(null);
    } catch (e: any) {
      toast({ title: 'Delete failed', variant: 'destructive' });
    }
  };

  const toggleComplete = async (ws: any) => {
    try {
      await adminRequest('update', 'workshops', { is_completed: !ws.is_completed }, ws.id, undefined, adminPwd);
      load();
    } catch (e: any) {
      toast({ title: 'Update failed', variant: 'destructive' });
    }
  };

  const addVideo = async () => {
    if (!videoUrl.trim() || !selectedWorkshop) return;
    try {
      await adminRequest('insert', 'workshop_videos', { workshop_id: selectedWorkshop, youtube_url: videoUrl, title: videoTitle || null }, undefined, undefined, adminPwd);
      setVideoUrl('');
      setVideoTitle('');
      loadWorkshopDetails(selectedWorkshop);
      toast({ title: 'Video added' });
    } catch (e: any) {
      toast({ title: 'Failed to add video', variant: 'destructive' });
    }
  };

  const addMaterial = async (file: File) => {
    if (!selectedWorkshop) return;
    try {
      const url = await uploadFile(file, `materials/${selectedWorkshop}`);
      await adminRequest('insert', 'workshop_materials', {
        workshop_id: selectedWorkshop,
        title: file.name,
        file_url: url,
        file_type: file.type,
      }, undefined, undefined, adminPwd);
      loadWorkshopDetails(selectedWorkshop);
      toast({ title: 'Material uploaded' });
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e.message, variant: 'destructive' });
    }
  };

  const deleteVideo = async (id: string) => {
    await adminRequest('delete', 'workshop_videos', undefined, id, undefined, adminPwd);
    if (selectedWorkshop) loadWorkshopDetails(selectedWorkshop);
  };

  const deleteMaterial = async (id: string) => {
    await adminRequest('delete', 'workshop_materials', undefined, id, undefined, adminPwd);
    if (selectedWorkshop) loadWorkshopDetails(selectedWorkshop);
  };

  const generateParticipantCert = async (participant: any) => {
    const ws = workshops.find(w => w.id === selectedWorkshop);
    if (!ws) return;
    const presenter = presenters.find(p => p.id === ws.presenter_id);
    try {
      const { certificateText } = await generateCertificateText({
        participantName: participant.full_name,
        workshopTitle: ws.title,
        workshopDate: ws.date,
        presenterName: presenter?.name || 'Presenter',
        signerName: company?.director_name || presenter?.name || 'Director',
        companyName: company?.company_name || 'Wildlife UK',
        type: 'participant',
      });
      await generateCertificatePDF({
        certificateText,
        participantName: participant.full_name,
        workshopTitle: ws.title,
        workshopDate: ws.date,
        signerName: company?.director_name || presenter?.name || 'Director',
        signatureUrl: company?.director_signature_url || presenter?.signature_url,
        companyName: company?.company_name || 'Wildlife UK',
        companyLogoUrl: company?.logo_url,
        type: 'participant',
      });
    } catch (e: any) {
      toast({ title: 'Certificate failed', description: e.message, variant: 'destructive' });
    }
  };

  const selectedWs = workshops.find(w => w.id === selectedWorkshop);

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-display font-bold text-foreground">Workshops</h2>
        <Button onClick={() => { setShowForm(true); setEditId(null); setForm({ title: '', description: '', date: '', duration_minutes: 60, location: '', presenter_id: '', max_participants: '' }); }} className="bg-accent text-accent-foreground gap-1">
          <Plus className="w-4 h-4" /> Add Workshop
        </Button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-card border border-border rounded-lg p-6 mb-6 overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display font-semibold">{editId ? 'Edit' : 'New'} Workshop</h3>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Input placeholder="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              <Input type="datetime-local" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              <Input placeholder="Duration (min)" type="number" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: Number(e.target.value) }))} />
              <Input placeholder="Location" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
              <select value={form.presenter_id} onChange={e => setForm(f => ({ ...f, presenter_id: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Select Presenter</option>
                {presenters.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <Input placeholder="Max Participants (optional)" type="number" value={form.max_participants} onChange={e => setForm(f => ({ ...f, max_participants: e.target.value }))} />
            </div>
            <Textarea placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="mt-4" />
            <Button onClick={saveWorkshop} className="mt-4 bg-primary text-primary-foreground gap-1"><Save className="w-4 h-4" /> Save</Button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-3">
        {workshops.map(ws => (
          <div key={ws.id} className={`bg-card border rounded-lg p-4 transition-colors ${selectedWorkshop === ws.id ? 'border-accent' : 'border-border'}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1 cursor-pointer" onClick={() => loadWorkshopDetails(ws.id)}>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-foreground">{ws.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${ws.is_completed ? 'bg-muted text-muted-foreground' : 'bg-accent/20 text-accent-foreground'}`}>
                    {ws.is_completed ? 'Completed' : 'Upcoming'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{format(new Date(ws.date), 'dd MMM yyyy HH:mm')} · {ws.location || 'No location'}</p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => toggleComplete(ws)} className="text-xs">{ws.is_completed ? 'Reopen' : 'Complete'}</Button>
                <Button variant="ghost" size="sm" onClick={() => { setEditId(ws.id); setForm({ title: ws.title, description: ws.description || '', date: ws.date?.substring(0, 16) || '', duration_minutes: ws.duration_minutes, location: ws.location || '', presenter_id: ws.presenter_id || '', max_participants: ws.max_participants?.toString() || '' }); setShowForm(true); }}>
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => deleteWorkshop(ws.id)} className="text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {selectedWorkshop === ws.id && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 pt-4 border-t border-border space-y-6">
                {/* Videos */}
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1"><Video className="w-4 h-4 text-accent" /> Videos</h4>
                  {videos.map(v => (
                    <div key={v.id} className="flex items-center gap-2 mb-2 text-sm">
                      <span className="flex-1 text-muted-foreground truncate">{v.title || v.youtube_url}</span>
                      <button onClick={() => deleteVideo(v.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                    </div>
                  ))}
                  <div className="flex gap-2 mt-2">
                    <Input placeholder="YouTube URL" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} className="text-sm" />
                    <Input placeholder="Title (optional)" value={videoTitle} onChange={e => setVideoTitle(e.target.value)} className="text-sm max-w-[200px]" />
                    <Button size="sm" onClick={addVideo} className="bg-accent text-accent-foreground">Add</Button>
                  </div>
                </div>

                {/* Materials */}
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1"><FileText className="w-4 h-4 text-accent" /> Materials</h4>
                  {materials.map(m => (
                    <div key={m.id} className="flex items-center gap-2 mb-2 text-sm">
                      <span className="flex-1 text-muted-foreground truncate">{m.title}</span>
                      <button onClick={() => deleteMaterial(m.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                    </div>
                  ))}
                  <label className="inline-flex items-center gap-2 mt-2 cursor-pointer bg-secondary text-secondary-foreground px-3 py-2 rounded-md text-sm">
                    <Upload className="w-4 h-4" /> Upload File
                    <input type="file" className="hidden" onChange={e => e.target.files?.[0] && addMaterial(e.target.files[0])} />
                  </label>
                </div>

                {/* Participants */}
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1"><Users className="w-4 h-4 text-accent" /> Participants ({participants.length})</h4>
                  {participants.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No participants yet</p>
                  ) : (
                    <div className="space-y-1">
                      {participants.map(p => (
                        <div key={p.id} className="flex items-center justify-between text-sm py-1">
                          <span className="text-foreground">{p.full_name} <span className="text-muted-foreground text-xs">({p.email})</span></span>
                          {ws.is_completed && (
                            <Button variant="ghost" size="sm" onClick={() => generateParticipantCert(p)} className="text-xs gap-1">
                              <Award className="w-3.5 h-3.5" /> Certificate
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PresentersTab({ adminPwd }: { adminPwd: string }) {
  const { toast } = useToast();
  const [presenters, setPresenters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', title: '', bio: '' });
  const [workshops, setWorkshops] = useState<any[]>([]);
  const [company, setCompany] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ps, ws, cs] = await Promise.all([
        adminRequest('list', 'presenters', undefined, undefined, { order: { column: 'name', ascending: true } }, adminPwd),
        adminRequest('list', 'workshops', undefined, undefined, { order: { column: 'date', ascending: false } }, adminPwd),
        getCompanySettings(),
      ]);
      setPresenters(ps || []);
      setWorkshops(ws || []);
      setCompany(cs);
    } catch (e: any) { toast({ title: 'Load failed', variant: 'destructive' }); }
    setLoading(false);
  }, [adminPwd, toast]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    try {
      if (editId) {
        await adminRequest('update', 'presenters', form, editId, undefined, adminPwd);
      } else {
        await adminRequest('insert', 'presenters', form, undefined, undefined, adminPwd);
      }
      setShowForm(false);
      setEditId(null);
      setForm({ name: '', title: '', bio: '' });
      load();
      toast({ title: 'Saved' });
    } catch (e: any) {
      toast({ title: 'Save failed', variant: 'destructive' });
    }
  };

  const del = async (id: string) => {
    if (!confirm('Delete?')) return;
    await adminRequest('delete', 'presenters', undefined, id, undefined, adminPwd);
    load();
  };

  const uploadSignature = async (id: string, file: File) => {
    try {
      const url = await uploadFile(file, `signatures/${id}`);
      await adminRequest('update', 'presenters', { signature_url: url }, id, undefined, adminPwd);
      load();
      toast({ title: 'Signature uploaded' });
    } catch (e: any) {
      toast({ title: 'Upload failed', variant: 'destructive' });
    }
  };

  const uploadPhoto = async (id: string, file: File) => {
    try {
      const url = await uploadFile(file, `photos/${id}`);
      await adminRequest('update', 'presenters', { photo_url: url }, id, undefined, adminPwd);
      load();
      toast({ title: 'Photo uploaded' });
    } catch (e: any) {
      toast({ title: 'Upload failed', variant: 'destructive' });
    }
  };

  const generatePresenterCert = async (presenter: any, workshopId: string) => {
    const ws = workshops.find(w => w.id === workshopId);
    if (!ws) return;
    try {
      const { certificateText } = await generateCertificateText({
        presenterName: presenter.name,
        workshopTitle: ws.title,
        workshopDate: ws.date,
        signerName: company?.director_name || 'Director',
        companyName: company?.company_name || 'Wildlife UK',
        type: 'presenter',
      });
      await generateCertificatePDF({
        certificateText,
        presenterName: presenter.name,
        workshopTitle: ws.title,
        workshopDate: ws.date,
        signerName: company?.director_name || 'Director',
        signatureUrl: company?.director_signature_url,
        companyName: company?.company_name || 'Wildlife UK',
        companyLogoUrl: company?.logo_url,
        type: 'presenter',
      });
      toast({ title: 'Certificate downloaded!' });
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
  };

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-display font-bold text-foreground">Presenters</h2>
        <Button onClick={() => { setShowForm(true); setEditId(null); setForm({ name: '', title: '', bio: '' }); }} className="bg-accent text-accent-foreground gap-1">
          <Plus className="w-4 h-4" /> Add Presenter
        </Button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-card border border-border rounded-lg p-6 mb-6 overflow-hidden">
            <div className="grid gap-4 md:grid-cols-2">
              <Input placeholder="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              <Input placeholder="Title / Role" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <Textarea placeholder="Bio" value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} className="mt-4" />
            <div className="flex gap-2 mt-4">
              <Button onClick={save} className="bg-primary text-primary-foreground gap-1"><Save className="w-4 h-4" /> Save</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-4">
        {presenters.map(p => {
          const presenterWorkshops = workshops.filter(w => w.presenter_id === p.id && w.is_completed);
          return (
            <div key={p.id} className="bg-card border border-border rounded-lg p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {p.photo_url ? (
                    <img src={p.photo_url} alt={p.name} className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-semibold">{p.name[0]}</div>
                  )}
                  <div>
                    <h3 className="font-semibold text-foreground">{p.name}</h3>
                    {p.title && <p className="text-xs text-muted-foreground">{p.title}</p>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => { setEditId(p.id); setForm({ name: p.name, title: p.title || '', bio: p.bio || '' }); setShowForm(true); }}><Edit2 className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => del(p.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <label className="inline-flex items-center gap-1 cursor-pointer bg-secondary text-secondary-foreground px-3 py-1.5 rounded text-xs">
                  <Upload className="w-3.5 h-3.5" /> Photo
                  <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadPhoto(p.id, e.target.files[0])} />
                </label>
                <label className="inline-flex items-center gap-1 cursor-pointer bg-secondary text-secondary-foreground px-3 py-1.5 rounded text-xs">
                  <Upload className="w-3.5 h-3.5" /> Signature
                  <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadSignature(p.id, e.target.files[0])} />
                </label>
                {p.signature_url && <span className="text-xs text-muted-foreground flex items-center">✓ Signature uploaded</span>}
              </div>

              {presenterWorkshops.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Generate Presenter Certificate:</p>
                  <div className="flex flex-wrap gap-2">
                    {presenterWorkshops.map(ws => (
                      <Button key={ws.id} variant="outline" size="sm" onClick={() => generatePresenterCert(p, ws.id)} className="text-xs gap-1">
                        <Award className="w-3.5 h-3.5" /> {ws.title}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SettingsTab({ adminPwd }: { adminPwd: string }) {
  const { toast } = useToast();
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ company_name: '', director_name: '', additional_details: '' });

  useEffect(() => {
    getCompanySettings()
      .then(s => { setSettings(s); setForm({ company_name: s.company_name || '', director_name: s.director_name || '', additional_details: s.additional_details || '' }); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    try {
      await adminRequest('update', 'company_settings', form, settings.id, undefined, adminPwd);
      toast({ title: 'Settings saved' });
      const s = await getCompanySettings();
      setSettings(s);
    } catch (e: any) {
      toast({ title: 'Save failed', variant: 'destructive' });
    }
  };

  const uploadLogo = async (file: File) => {
    try {
      const url = await uploadFile(file, 'company');
      await adminRequest('update', 'company_settings', { logo_url: url }, settings.id, undefined, adminPwd);
      toast({ title: 'Logo uploaded' });
      const s = await getCompanySettings();
      setSettings(s);
    } catch (e: any) {
      toast({ title: 'Upload failed', variant: 'destructive' });
    }
  };

  const uploadSignature = async (file: File) => {
    try {
      const url = await uploadFile(file, 'company');
      await adminRequest('update', 'company_settings', { director_signature_url: url }, settings.id, undefined, adminPwd);
      toast({ title: 'Signature uploaded' });
      const s = await getCompanySettings();
      setSettings(s);
    } catch (e: any) {
      toast({ title: 'Upload failed', variant: 'destructive' });
    }
  };

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div className="max-w-lg">
      <h2 className="text-xl font-display font-bold text-foreground mb-6 flex items-center gap-2">
        <Settings className="w-5 h-5 text-accent" /> Company Settings
      </h2>
      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">Company Name</label>
          <Input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">Director / Signer Name</label>
          <Input value={form.director_name} onChange={e => setForm(f => ({ ...f, director_name: e.target.value }))} />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">Additional Details</label>
          <Textarea value={form.additional_details} onChange={e => setForm(f => ({ ...f, additional_details: e.target.value }))} />
        </div>

        <div className="flex flex-wrap gap-3">
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Company Logo</label>
            <label className="inline-flex items-center gap-2 cursor-pointer bg-secondary text-secondary-foreground px-3 py-2 rounded text-sm">
              <Upload className="w-4 h-4" /> {settings?.logo_url ? 'Change Logo' : 'Upload Logo'}
              <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
            </label>
            {settings?.logo_url && <img src={settings.logo_url} alt="Logo" className="mt-2 w-16 h-16 object-contain rounded" />}
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Director Signature</label>
            <label className="inline-flex items-center gap-2 cursor-pointer bg-secondary text-secondary-foreground px-3 py-2 rounded text-sm">
              <Upload className="w-4 h-4" /> {settings?.director_signature_url ? 'Change' : 'Upload'}
              <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadSignature(e.target.files[0])} />
            </label>
            {settings?.director_signature_url && <img src={settings.director_signature_url} alt="Signature" className="mt-2 h-10 object-contain" />}
          </div>
        </div>

        <Button onClick={save} className="bg-primary text-primary-foreground gap-1"><Save className="w-4 h-4" /> Save Settings</Button>
      </div>
    </div>
  );
}

export default AdminPanel;
