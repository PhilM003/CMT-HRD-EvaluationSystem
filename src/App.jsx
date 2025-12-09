import React, { useState, useEffect, useRef } from 'react';
import { 
  User, Calendar, ClipboardList, CheckCircle, Calculator, PenTool, Search, 
  Save, Trash2, Database, LayoutDashboard, FileSpreadsheet, Plus, 
  ArrowLeft, Users, FileText, ChevronRight, AlertCircle, RotateCcw, X, Eye, UploadCloud, Settings, TableProperties,
  LogOut, Lock, Key, Printer, ChevronDown, Loader2, Mail, Briefcase
} from 'lucide-react';

import logoImage from './assets/enterprise.png'; 

// ============================================================================
// ⚠️ CONFIGURATION: ใส่ URL ของ Web App ล่าสุดที่ Deploy (ลงท้ายด้วย /exec)
// ============================================================================
const API_URL = 'https://script.google.com/macros/s/AKfycbwAL1ISDOIC_0TVh4RZniHn34vP0O7x5yBHlyxGZ1-u8ctgEg9OtG9dNMAZwxH7sNww/exec'; 
const LOGO_URL = logoImage;

// --- Helper: API Caller (แกะกล่องข้อมูลอัตโนมัติ) ---
const apiCall = async (payload) => {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();

    // 🛡️ Logic แกะกล่อง: ถ้า Backend ส่งมาแบบ { success: true, data: ... }
    if (result && result.success === true && result.data !== undefined) {
      return result.data; // ✅ ส่งเฉพาะไส้ใน (data) ออกไป
    }

    // กรณี Backend ส่งมาแบบ Array ดิบๆ หรือแบบอื่น
    return result;

  } catch (error) {
    console.error("API Error:", error);
    // 🛡️ กันตาย: ถ้าพังให้ส่ง [] หรือ {} ว่างๆ กลับไป แอปจะได้ไม่จอขาว
    return Array.isArray(payload) ? [] : {}; 
  }
};

const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
  } catch (e) { return ''; }
  return '';
};

// --- Component: Loading Overlay ---
const GlobalLoading = () => (
  <div className="fixed inset-0 z-[100] bg-white/50 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
    <div className="bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 border border-secondary-silver/50">
       <div className="relative">
         <div className="w-12 h-12 border-4 border-primary-navy/20 border-t-primary-navy rounded-full animate-spin"></div>
         <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-primary-gold rounded-full"></div>
         </div>
       </div>
       <div className="text-center">
          <p className="text-primary-navy font-bold text-lg">กำลังประมวลผล...</p>
          <p className="text-neutral-medium text-xs">Please wait a moment</p>
       </div>
    </div>
  </div>
);

// ==========================================
// MAIN APP COMPONENT
// ==========================================
export default function App() {
  // Global State
  const [user, setUser] = useState({ 
    username: 'admin', 
    name: 'Assess Admin',  // เปลี่ยนชื่อตามต้องการ
    role: 'admin'          // ใช้ role 'admin' เพื่อให้เข้าถึง Settings/Dashboard ได้
  }); 
  
  const [view, setView] = useState('dashboard'); 
  const [showEmployeeModal, setShowEmployeeModal] = useState(false); 
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  // Data State
  const [evaluations, setEvaluations] = useState([]);
  const [employees, setEmployees] = useState([]); 
  // เก็บค่า Settings (เพิ่ม Title เข้ามา)
  const [appSettings, setAppSettings] = useState({ 
    email_hr: '', 
    role_hr_title: 'ฝ่ายบุคคล (HR)', // Default value
    email_approver: '',
    role_approver_title: 'ผู้อนุมัติ (Approver)' // Default value
  }); 
  const [selectedEval, setSelectedEval] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [autoOpenRole, setAutoOpenRole] = useState(null);

  // --- Initial Load ---
  useEffect(() => {
    // Favicon
    if (LOGO_URL) {
      const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
      link.type = 'image/x-icon';
      link.rel = 'shortcut icon';
      link.href = LOGO_URL;
      document.getElementsByTagName('head')[0].appendChild(link);
    }

    // Check Magic Link
    const params = new URLSearchParams(window.location.search);
    const linkEvalId = params.get('eval_id');
    const linkSignRole = params.get('sign_role');

    if (linkEvalId && linkSignRole) {
        handleMagicLinkAccess(linkEvalId, linkSignRole);
    } else {
        fetchEvaluations();
        fetchEmployees();
    }
    // ดึงค่า Settings
    fetchSettings();
  }, []);

  // --- API Functions ---
  const handleMagicLinkAccess = async (id, role) => {
      setIsLoading(true);
      try {
          const guestUser = { 
            name: `${role.toUpperCase()} (Guest Access)`, 
            role: role, 
            username: 'guest' 
          };
          setUser(guestUser); // Set เป็น Guest
          const data = await apiCall({ action: 'getEvaluationById', id: id });
          if (!data || data.message === "Not found") throw new Error("Form not found");
          setSelectedEval(data);
          setView('form');
          setAutoOpenRole(role);
          window.history.replaceState({}, document.title, "/");
      } catch (e) {
          alert("ไม่พบข้อมูลแบบประเมิน หรือ Link ไม่ถูกต้อง");
      } finally {
          setIsLoading(false);
      }
  };

  const fetchEvaluations = async () => {
    setIsLoading(true);
    try {
      const data = await apiCall({ action: 'getEvaluations' });
      setEvaluations(Array.isArray(data) ? data : []);
    } catch (error) { 
        console.error("Connection Error:", error); 
    } finally {
        setIsLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const data = await apiCall({ action: 'getEmployees' });
      setEmployees(Array.isArray(data) ? data : []);
    } catch (error) { console.log("Fetch Employees Error:", error); }
  };

  const fetchSettings = async () => {
    try {
      const data = await apiCall({ action: 'getSettings' });
      setAppSettings({
        email_hr: data.email_hr || '',
        role_hr_title: data.role_hr_title || 'ฝ่ายบุคคล (HR)',
        email_approver: data.email_approver || '',
        role_approver_title: data.role_approver_title || 'ผู้อนุมัติ (Approver)'
      });
    } catch (error) { console.error("Settings Error:", error); }
  };

  const handleCreateNew = () => { setSelectedEval(null); setView('form'); setAutoOpenRole(null); };
  const handleEdit = (evaluation) => { setSelectedEval(evaluation); setView('form'); setAutoOpenRole(null); };
  
  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if(!confirm("⚠️ ต้องการลบแบบประเมินนี้ใช่หรือไม่?")) return;
    setIsLoading(true);
    try { 
        await apiCall({ action: 'deleteEvaluation', id: id });
        await fetchEvaluations(); 
    } catch (error) { 
        alert("Error deleting record"); 
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleSaveComplete = async () => { 
      await fetchEvaluations(); 
      setView('dashboard'); 
      setAutoOpenRole(null); 
  };

  // --- RENDER ---
  return (
    <div className="min-h-screen font-sans text-neutral-dark bg-secondary-cream/30">
      
      {isLoading && <GlobalLoading />}

      {/* Top Bar */}
      <div className="bg-primary-navy text-white px-6 py-3 flex justify-between items-center shadow-md sticky top-0 z-50">
         <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-lg flex items-center justify-center">
              {LOGO_URL ? (
                <img src={LOGO_URL} alt="App Logo" className="w-6 h-6 object-contain" />
              ) : (
                <ClipboardList size={24} className="text-primary-gold"/>
              )}
            </div>
            <div>
               <h1 className="font-bold text-lg leading-tight">Evaluation System</h1>
               <p className="text-[10px] text-gray-300 tracking-wider">PROBATION ASSESSMENT</p>
            </div>
         </div>
         
         <div className="flex items-center gap-4">
          {/* ปุ่ม Settings (แสดงเฉพาะ Admin/Assess) */}
            {(user.role === 'admin' || user.role === 'assess') && (
              <button 
                onClick={() => setShowSettingsModal(true)} 
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-primary-gold transition-colors"
                title="ตั้งค่าระบบ"
              >
                <Settings size={20} />
              </button>
            )}

            <div className="flex items-center gap-3 bg-white/10 px-4 py-2 rounded-xl border border-white/10">
                <div className="text-right hidden md:block">
                    <p className="text-xs text-gray-300 uppercase tracking-widest">User Role</p>
                    <p className="font-bold text-primary-gold">{user.name}</p>
                </div>
                <div className="h-8 w-8 bg-primary-gold rounded-full flex items-center justify-center text-primary-navy font-bold shadow-inner">
                    {user.role.charAt(0).toUpperCase()}
                </div>
            </div>
         </div>
      </div>

      {/* Main Content */}
      {view === 'dashboard' ? (
        <DashboardView 
          evaluations={evaluations} 
          onCreate={handleCreateNew} 
          onEdit={handleEdit} 
          onDelete={handleDelete}
          onManageEmployees={() => setShowEmployeeModal(true)} 
          currentRole={user.role} 
        />
      ) : (
        <EvaluationForm 
          initialData={selectedEval} 
          employeeList={employees}
          currentRole={user.role} 
          onBack={() => { setView('dashboard'); setAutoOpenRole(null); }}
          onSaveComplete={handleSaveComplete}
          autoOpenSignRole={autoOpenRole} 
          setGlobalLoading={setIsLoading}
          appSettings={appSettings} // ส่ง Settings ไปให้ Form ใช้
        />
      )}

      {/* Modals */}
      {showEmployeeModal && (
        <EmployeeManagementModal 
          onClose={() => setShowEmployeeModal(false)}
          currentEmployees={employees}
          onRefresh={fetchEmployees}
          setGlobalLoading={setIsLoading}
        />
      )}

      {showSettingsModal && (
        <SettingsModal 
          onClose={() => setShowSettingsModal(false)}
          currentSettings={appSettings}
          onSave={(newSettings) => {
             setAppSettings(newSettings);
             setShowSettingsModal(false);
          }}
          setGlobalLoading={setIsLoading}
        />
      )}

    </div>
  );
}

// ==========================================
// SUB COMPONENTS
// ==========================================

const SettingsModal = ({ onClose, currentSettings, onSave, setGlobalLoading }) => {
  const [formData, setFormData] = useState({
    role_hr_title: currentSettings.role_hr_title || 'ฝ่ายบุคคล (HR)',
    email_hr: currentSettings.email_hr || '',
    role_approver_title: currentSettings.role_approver_title || 'ผู้อนุมัติ (Approver)',
    email_approver: currentSettings.email_approver || ''
  });

  const handleSave = async () => {
    setGlobalLoading(true);
    try {
      await apiCall({
        action: 'saveSettings',
        settings: formData
      });
      alert('✅ บันทึกการตั้งค่าเรียบร้อย\n(หมายเหตุ: หากชื่อตำแหน่งไม่เปลี่ยน กรุณาตรวจสอบโค้ด Backend)');
      onSave(formData);
    } catch (e) {
      alert('❌ บันทึกไม่สำเร็จ');
    } finally {
      setGlobalLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-neutral-dark/60 flex items-center justify-center backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-secondary-silver/50">
        <div className="p-5 border-b border-secondary-silver bg-white flex justify-between items-center">
           <h3 className="font-bold text-xl text-primary-navy flex items-center gap-2">
             <Settings className="text-primary-gold" size={24}/> ตั้งค่าระบบ (Configuration)
           </h3>
           <button onClick={onClose}><X size={24} className="text-secondary-silver hover:text-red-500"/></button>
        </div>
        
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
           {/* ส่วนที่ 1: HR */}
           <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
             <h4 className="font-bold text-primary-navy mb-3 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary-navy text-white flex items-center justify-center text-xs">1</div>
                ตั้งค่าผู้ตรวจสอบ (Reviewer/HR)
             </h4>
             <div className="space-y-4 pl-8">
               <div>
                  <label className="block text-xs font-bold text-neutral-medium mb-1">ชื่อตำแหน่ง (Position Title)</label>
                  <input 
                    type="text" 
                    value={formData.role_hr_title} 
                    onChange={e => setFormData({...formData, role_hr_title: e.target.value})}
                    className="w-full border border-secondary-silver rounded-lg p-2.5 text-sm focus:border-primary-gold outline-none"
                    placeholder="เช่น HR Manager, ฝ่ายบุคคล"
                  />
               </div>
               <div>
                  <label className="block text-xs font-bold text-neutral-medium mb-1">อีเมลแจ้งเตือน (Email Notification)</label>
                  <input 
                    type="email" 
                    value={formData.email_hr} 
                    onChange={e => setFormData({...formData, email_hr: e.target.value})}
                    className="w-full border border-secondary-silver rounded-lg p-2.5 text-sm focus:border-primary-gold outline-none"
                    placeholder="hr@example.com"
                  />
               </div>
             </div>
           </div>

           {/* ส่วนที่ 2: Approver */}
           <div className="bg-yellow-50/50 p-4 rounded-xl border border-yellow-100">
             <h4 className="font-bold text-primary-navy mb-3 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-secondary-darkgold text-white flex items-center justify-center text-xs">2</div>
                ตั้งค่าผู้อนุมัติ (Approver)
             </h4>
             <div className="space-y-4 pl-8">
               <div>
                  <label className="block text-xs font-bold text-neutral-medium mb-1">ชื่อตำแหน่ง (Position Title)</label>
                  <input 
                    type="text" 
                    value={formData.role_approver_title} 
                    onChange={e => setFormData({...formData, role_approver_title: e.target.value})}
                    className="w-full border border-secondary-silver rounded-lg p-2.5 text-sm focus:border-primary-gold outline-none"
                    placeholder="เช่น CEO, Director, ผู้อนุมัติ"
                  />
               </div>
               <div>
                  <label className="block text-xs font-bold text-neutral-medium mb-1">อีเมลแจ้งเตือน (Email Notification)</label>
                  <input 
                    type="email" 
                    value={formData.email_approver} 
                    onChange={e => setFormData({...formData, email_approver: e.target.value})}
                    className="w-full border border-secondary-silver rounded-lg p-2.5 text-sm focus:border-primary-gold outline-none"
                    placeholder="ceo@example.com"
                  />
               </div>
             </div>
           </div>
        </div>

        <div className="p-5 border-t border-secondary-silver bg-gray-50 flex justify-end gap-3">
           <button onClick={onClose} className="px-4 py-2 text-gray-500 font-bold hover:bg-gray-200 rounded-lg">ยกเลิก</button>
           <button onClick={handleSave} className="px-6 py-2 bg-primary-navy text-white font-bold rounded-lg hover:bg-accent-royalblue shadow-lg flex items-center gap-2">
              <Save size={18} /> บันทึกการตั้งค่า
           </button>
        </div>
      </div>
    </div>
  );
};

const DashboardView = ({ evaluations = [], onCreate, onEdit, onDelete, onManageEmployees, currentRole }) => {
    return (
    <div className="max-w-7xl mx-auto p-8 animate-in fade-in duration-500">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
        <div>
           <h1 className="text-4xl font-extrabold text-primary-navy flex items-center gap-3 drop-shadow-sm">
             <div className="bg-primary-gold text-white p-2 rounded-xl shadow-lg">
                <FileText size={32}/> 
             </div>
             Dashboard
           </h1>
           <p className="text-neutral-medium mt-2 text-lg font-light pl-16">ภาพรวมการประเมินผลการทดลองงาน</p>
        </div>
        <div className="flex gap-3">
           {currentRole === 'admin' && (
             <button onClick={onManageEmployees} className="flex items-center gap-2 bg-white border-2 border-secondary-darkgold text-secondary-darkgold hover:bg-secondary-darkgold hover:text-white px-5 py-2.5 rounded-xl font-bold shadow-sm transition-all hover:shadow-md">
                <Users size={20}/> จัดการพนักงาน
             </button>
           )}
           {(currentRole === 'admin' || currentRole === 'assessor') && (
             <button onClick={onCreate} className="flex items-center gap-2 bg-primary-navy hover:bg-accent-royalblue text-white px-6 py-2.5 rounded-xl font-bold shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl hover:from-primary-navy hover:to-primary-navy">
                <Plus size={20}/> สร้างแบบประเมิน
             </button>
           )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
         <StatCard 
            label="แบบประเมินทั้งหมด" 
            value={evaluations.length} 
            icon={<FileText size={28} className="text-white"/>} 
            bgClass="bg-gradient-to-br from-primary-navy to-gray-700 text-white border-none"
            subText="All Records"
         />
         <StatCard 
            label="รอ HR ตรวจสอบ" 
            value={evaluations.filter(e=>e.status==='pending_hr').length} 
            icon={<Users size={28} className="text-secondary-darkgold"/>} 
            bgClass="bg-white border-l-4 border-primary-gold text-primary-navy shadow-md"
            subText="Pending HR"
         />
         <StatCard 
            label="รออนุมัติ (CEO)" 
            value={evaluations.filter(e=>e.status==='pending_approval').length} 
            icon={<User size={28} className="text-accent-royalblue"/>} 
            bgClass="bg-white border-l-4 border-accent-royalblue text-primary-navy shadow-md"
            subText="Pending CEO"
         />
         <StatCard 
            label="เสร็จสมบูรณ์" 
            value={evaluations.filter(e=>e.status==='completed').length} 
            icon={<CheckCircle size={28} className="text-green-600"/>} 
            bgClass="bg-white border-l-4 border-green-600 text-primary-navy shadow-md"
            subText="Completed"
         />
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-secondary-silver/30">
         <div className="p-6 border-b border-secondary-silver/50 flex justify-between items-center bg-gradient-to-r from-white to-secondary-cream/30">
            <h3 className="font-bold text-xl text-primary-navy flex items-center gap-2">
              <Database size={20} className="text-primary-gold"/> รายการประเมิน (All Evaluations)
            </h3>
            <span className="text-xs font-bold text-primary-navy bg-secondary-cream px-3 py-1.5 rounded-full border border-primary-gold/30">
              {evaluations.length} Records Found
            </span>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="bg-primary-navy text-white text-sm uppercase tracking-wider">
                     <th className="p-5 font-bold">พนักงาน (Employee)</th>
                     <th className="p-5 font-bold">แผนก (Dept)</th>
                     <th className="p-5 font-bold text-center">คะแนนรวม</th>
                     <th className="p-5 font-bold text-center">สถานะ (Status)</th>
                     <th className="p-5 font-bold text-center">อัปเดตล่าสุด</th>
                     <th className="p-5 font-bold text-right">จัดการ</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-secondary-silver/30">
                  {evaluations.length === 0 ? (
                    <tr><td colSpan="6" className="p-16 text-center text-neutral-medium bg-secondary-cream/10">
                        <div className="flex flex-col items-center gap-4">
                            <div className="p-4 bg-secondary-silver/20 rounded-full"><AlertCircle size={48} className="text-secondary-silver"/></div>
                            <div>
                              <p className="font-bold text-lg text-neutral-dark">ไม่พบข้อมูลแบบประเมิน</p>
                              <p className="text-sm">กดปุ่ม "สร้างแบบประเมิน" เพื่อเริ่มต้นใช้งาน</p>
                            </div>
                        </div>
                    </td></tr>
                  ) : (
                    evaluations.map(ev => (
                       <tr key={ev.id} onClick={() => onEdit(ev)} className="hover:bg-accent-sand/10 transition-all duration-200 group cursor-pointer bg-white">
                          <td className="p-5">
                             <div className="font-bold text-primary-navy text-base">{ev.employeeName || "ไม่ระบุชื่อ"}</div>
                             <div className="text-xs text-secondary-darkgold font-mono mt-0.5 font-bold bg-secondary-cream inline-block px-1.5 rounded border border-secondary-silver/20">{ev.employeeId || "-"}</div>
                          </td>
                          <td className="p-5">
                             <div className="text-sm font-medium text-neutral-dark">{ev.position || "-"}</div>
                             <div className="text-xs text-neutral-medium">{ev.department}</div>
                          </td>
                          <td className="p-5 text-center">
                             <ScoreBadge ratings={ev.ratings} />
                          </td>
                          <td className="p-5 text-center">
                             <StatusBadge status={ev.status} />
                          </td>
                          <td className="p-5 text-center text-xs text-neutral-medium">
                             <div className="font-medium">{ev.lastUpdated ? new Date(ev.lastUpdated).toLocaleDateString('th-TH') : "-"}</div>
                             <div className="text-[10px] opacity-60 uppercase mt-0.5">{ev.updatedBy || 'System'}</div>
                          </td>
                          <td className="p-5 text-right">
                             <div className="flex justify-end gap-3 items-center">
                                <span className="text-xs font-bold text-primary-gold opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">แก้ไข</span>
                                <div className="p-2 rounded-full bg-secondary-cream group-hover:bg-primary-navy group-hover:text-white transition-all">
                                   <ChevronRight size={18} />
                                </div>
                                {currentRole === 'admin' && (
                                   <button onClick={(e) => onDelete(ev.id, e)} className="p-2 text-secondary-silver hover:text-red-500 hover:bg-red-50 rounded-full transition-all ml-2 z-10"><Trash2 size={18}/></button>
                                )}
                             </div>
                          </td>
                       </tr>
                    ))
                  )}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};


const EvaluationForm = ({ initialData, employeeList = [], currentRole, onBack, onSaveComplete, autoOpenSignRole, setGlobalLoading, appSettings }) => {
  const [status, setStatus] = useState(initialData?.status || 'draft');
  const [dbId, setDbId] = useState(initialData?.id || null);
  const [isComplete, setIsComplete] = useState(false);
  const isAdmin = currentRole === 'admin';
  const canEdit = (targetRole) => {
      if (status === 'completed' || status === 'rejected') return false;
      if (isAdmin && targetRole === 'assessor') return true;
      return currentRole === targetRole;
    };
  
  const initialFormData = {
    employeeName: '', employeeId: '', position: '', section: '', department: '', startDate: '', dueProbationDate: '',
    attendFrom: '', attendTo: '',
    sickLeave: { days: '', hours: '' }, personalLeave: { days: '', hours: '' }, otherLeave: { days: '', hours: '' }, late: { times: '', mins: '' }, absence: { days: '', hours: '' },
    ratings: {},
    passProbation: false, notPassProbation: false, notPassReason: '', otherOpinion: false, otherOpinionText: '',
    assessorSign: '', hrOpinion: '', hrSign: '', approverSign: ''
  };
  const [formData, setFormData] = useState(initialData || initialFormData);
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [signTarget, setSignTarget] = useState(null);
  
  const [totalScore, setTotalScore] = useState(0);
  const [avgScore, setAvgScore] = useState(0);

  useEffect(() => {
    if (autoOpenSignRole && !signatureModalOpen) {
       const isHRTurn = autoOpenSignRole === 'hr' && status === 'pending_hr';
       const isApproverTurn = autoOpenSignRole === 'approver' && status === 'pending_approval';

       if (isHRTurn || isApproverTurn) {
           setTimeout(() => {
               openSignaturePad(autoOpenSignRole);
           }, 800); 
       }
    }
  }, [autoOpenSignRole, status]);

  const evaluationTopics = [
    { id: 1, weight: 15, t: 'ปริมาณงานที่ทำสำเร็จ (Work Quantity)' },
    { id: 2, weight: 15, t: 'คุณภาพของงาน (Work Quality)' },
    { id: 3, weight: 15, t: 'การปฏิบัติตามคำสั่ง (Compliance)' },
    { id: 4, weight: 10, t: 'การเรียนรู้งาน (Learning)' },
    { id: 5, weight: 10, t: 'ความรับผิดชอบ (Responsibility)' },
    { id: 6, weight: 10, t: 'การทำงานเป็นทีม (Teamwork)' },
    { id: 7, weight: 10, t: 'การตรงต่อเวลา (Punctuality)' },
    { id: 8, weight: 5,  t: 'ความปลอดภัย (Safety)' },
    { id: 9, weight: 5,  t: 'ความซื่อสัตย์ (Honesty)' },
    { id: 10, weight: 5, t: 'กฎระเบียบ (Rules)' }
  ];

  // Score Calculation
  useEffect(() => {
    let weightedSum = 0; 
    let rawSum = 0;      
    let count = 0;       

    evaluationTopics.forEach(topic => {
      const r = formData.ratings[topic.id] || 0;
      if(r > 0) {
        weightedSum += (topic.weight / 7) * r;
        rawSum += r;
        count++;
      }
    });

    setTotalScore(weightedSum);
    setAvgScore(count > 0 ? rawSum / count : 0);
  }, [formData.ratings]);

  const handleNameSearch = (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, employeeName: value }));
    setShowEmployeeDropdown(true); 
  };

  const selectEmployee = (emp) => {
    setFormData(prev => ({
      ...prev,
      employeeName: emp.name, 
      employeeId: emp.id, 
      position: emp.position, 
      section: emp.section, 
      department: emp.department, 
      startDate: emp.startDate, 
      dueProbationDate: emp.dueProbation 
    }));
    setShowEmployeeDropdown(false);
  };

  const handleInputChange = (e) => {
    const { name } = e.target;
    if (name !== 'employeeName' && currentRole !== 'admin') return; 

    const { value, type, checked } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({ ...prev, [parent]: { ...prev[parent], [child]: value } }));
    } else {
      setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    }
  };

  const handleRatingChange = (topicId, score) => {
    if (!canEdit('general')) return;
    setFormData(prev => ({ ...prev, ratings: { ...prev.ratings, [topicId]: score } }));
  };

  const handleOpinionChange = (type) => {
    if (!canEdit('general')) return;
    setFormData(prev => ({
      ...prev,
      passProbation: type === 'pass' ? !prev.passProbation : false,
      notPassProbation: type === 'notPass' ? !prev.notPassProbation : false,
      otherOpinion: type === 'other' ? !prev.otherOpinion : false
    }));
  };

  const handleHROpinionChange = (e) => {
    if (!canEdit('hr')) return;
    setFormData(prev => ({ ...prev, hrOpinion: e.target.value }));
  };

  const isReadOnly = (section) => !canEdit(section);
  const isEmployeeInfoEditable = () => currentRole === 'admin';

  const handleResetStatus = () => {
    if (!confirm("⚠️ ต้องการรีเซ็ตสถานะกลับเป็น Draft หรือไม่?")) return;
    setStatus('draft');
    setFormData(prev => ({ ...prev, assessorSign: '', hrSign: '', approverSign: '' }));
  };
  
  const openSignaturePad = (target) => {
    if (target === 'assessor' && isAdmin) {
        setSignTarget(target);
        setSignatureModalOpen(true);
        return;
    }
    if (currentRole !== target) return alert("⛔ คุณไม่มีสิทธิ์เซ็นช่องนี้");
    if (target === 'hr' && status === 'draft') return alert("⚠️ ต้องให้ผู้ประเมินส่งเรื่องมาก่อน");
    if (target === 'approver' && status !== 'pending_approval') return alert("⚠️ ต้องผ่านการตรวจสอบจาก HR ก่อน");
    setSignTarget(target);
    setSignatureModalOpen(true);
  };

  const saveToDB = async () => {
    if (!formData.employeeName) return alert("❌ กรุณาระบุชื่อพนักงาน");
    
    setGlobalLoading(true);
    const payload = { 
        ...formData, 
        status, 
        lastUpdated: new Date().toISOString(), 
        updatedBy: currentRole,
        action: 'saveEvaluation' 
    };
    
    try {
      const savedData = await apiCall(payload);
      
      setDbId(savedData.id); 
      alert("✅ บันทึกข้อมูลเรียบร้อย");
      onSaveComplete();
    } catch (error) { 
        alert("❌ บันทึกไม่สำเร็จ"); 
    } finally { 
        setGlobalLoading(false);
    }
  };

  const handleSaveSignature = async (dataUrl) => { 
    let newStatus = status;
    if (signTarget === 'assessor') newStatus = 'pending_hr';
    if (signTarget === 'hr') newStatus = 'pending_approval';
    if (signTarget === 'approver') newStatus = 'completed';
    
    const updatedFormData = { 
        ...formData, 
        status: newStatus,
        [signTarget === 'assessor' ? 'assessorSign' : signTarget === 'hr' ? 'hrSign' : 'approverSign']: dataUrl,
        lastUpdated: new Date().toISOString(), 
        updatedBy: currentRole,
        action: 'saveEvaluation'
    };

    try {
        setGlobalLoading(true);
        const savedData = await apiCall(updatedFormData);
        
        setDbId(savedData.id);
        setFormData(savedData);
        setStatus(newStatus);
        setSignatureModalOpen(false);

        // ✅ ส่ง Email โดยใช้ Settings และ Title ใหม่
        await sendGmailNotification(savedData.employeeName, status, newStatus, savedData.id, appSettings);

        if (autoOpenSignRole) {
            setIsComplete(true); 
        } else {
            alert("✅ บันทึกข้อมูลและส่งอีเมลเรียบร้อยแล้ว");
        }

    } catch (error) {
        console.error(error);
        alert("เกิดข้อผิดพลาด: " + error.message);
    } finally {
        setGlobalLoading(false);
    }
  };

  if (isComplete) {
    return (
      <div className="flex justify-between items-center mb-6 print:hidden">
        
        {/* ✅ ปุ่มย้อนกลับ หรือ แสดงสถานะ (ตาม Role) */}
        {isAdmin ? (
            <button 
                onClick={onBack} 
                className="flex items-center text-neutral-medium hover:text-primary-navy transition-colors font-bold px-3 py-2 rounded-lg hover:bg-secondary-cream/50"
            >
                <ArrowLeft className="mr-2" size={20}/> กลับหน้า Dashboard
            </button>
        ) : (
            <div className="flex items-center gap-2 text-neutral-medium font-bold px-3 py-2">
                <User size={20}/> มุมมองผู้ตรวจสอบ ({currentRole.toUpperCase()})
            </div>
        )}

        {/* ✅ กลุ่มปุ่มขวา: Status Badge + Print + Save + Reset */}
        <div className="flex items-center gap-3">
            <StatusBadge status={status} size="lg" />
            
            {/* ปุ่ม Print */}
            <button onClick={() => handlePrint(formData, totalScore, avgScore, appSettings)} className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-gray-700 transition-all">
                <Printer size={18}/> พิมพ์
            </button>

            {/* ✅ [เพิ่ม] ปุ่ม Save: แสดงเฉพาะ Admin หรือคนที่ถึงคิวแก้ไข */}
            {(isAdmin || canEdit(currentRole)) && (
                <button 
                    onClick={() => handleSaveToDB()} 
                    className="flex items-center gap-2 bg-secondary-darkgold text-white px-4 py-2 rounded-lg font-bold shadow-md hover:bg-yellow-600 transition-all"
                >
                    <Save size={18}/> บันทึก
                </button>
            )}

            {/* ปุ่ม Reset Status (เฉพาะ Admin) */}
            {(status !== 'draft' && isAdmin) && (
                <button onClick={handleResetStatus} className="flex items-center gap-2 bg-white text-red-600 border border-red-200 hover:bg-red-50 px-4 py-2 rounded-lg font-bold shadow-sm transition-all" title="Reset กลับไปเป็น Draft">
                    <RotateCcw size={18}/> Reset
                </button>
            )}
        </div>
      </div>
    );
  }

  // Render Form
return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 animate-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Controls */}
      <div className="flex justify-between items-center mb-6 print:hidden">
        
        {/* ✅ 5. ซ่อนปุ่ม "กลับหน้า Dashboard" ถ้าไม่ใช่ Admin */}
        {isAdmin ? (
            <button 
                onClick={onBack} 
                className="flex items-center text-neutral-medium hover:text-primary-navy transition-colors font-bold px-3 py-2 rounded-lg hover:bg-secondary-cream/50"
            >
                <ArrowLeft className="mr-2" size={20}/> กลับหน้า Dashboard
            </button>
        ) : (
            <div className="flex items-center gap-2 text-neutral-medium font-bold px-3 py-2">
                <User size={20}/> มุมมองผู้ตรวจสอบ ({currentRole.toUpperCase()})
            </div>
        )}

        <div className="flex items-center gap-3">
            <StatusBadge status={status} size="lg" />
            
            <button onClick={() => handlePrint(formData, totalScore, avgScore, appSettings)} className="flex items-center gap-2 bg-secondary-darkgold text-white px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-yellow-600 transition-all">
                <Printer size={18}/> พิมพ์ (Print)
            </button>

            {/* ปุ่ม Reset Status (เฉพาะ Admin) */}
            {(status !== 'draft' && isAdmin) && (
                <button onClick={handleResetStatus} className="flex items-center gap-2 bg-white text-secondary-darkgold border border-secondary-darkgold hover:bg-secondary-cream px-4 py-2 rounded-lg font-bold shadow-sm transition-all">
                    <RotateCcw size={18}/> Reset Status
                </button>
            )}
        </div>
      </div>

      <div className="text-center pt-2 pb-6 border-b border-secondary-silver/30">
          <h1 className="text-3xl font-extrabold text-primary-navy tracking-tight drop-shadow-sm">แบบประเมินผลการทดลองงาน</h1>
          <p className="text-neutral-medium text-lg mt-1 font-medium">Probation Evaluation Form</p>
      </div>
      
      {/* 1. Employee Info Section */}
      <div className="bg-white border border-secondary-silver/50 rounded-2xl p-8 relative shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-primary-gold rounded-l-2xl"></div>
          <h3 className="font-bold text-xl mb-6 text-primary-navy flex items-center border-b border-secondary-silver/30 pb-3">
             <div className="p-2 bg-secondary-cream rounded-lg mr-3 text-primary-gold shadow-sm"><User size={24}/></div>
             ข้อมูลพนักงาน (Employee Info)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="relative">
               <label className="text-xs text-neutral-medium font-bold mb-2 block uppercase tracking-wider">ชื่อพนักงาน (Name)</label>
               <div className="relative">
                 <input 
                    type="text" 
                    name="employeeName" 
                    value={formData.employeeName} 
                    onChange={handleNameSearch} 
                    onFocus={()=>{if(employeeList.length>0)setShowEmployeeDropdown(true)}} 
                    onBlur={()=>{setTimeout(()=>setShowEmployeeDropdown(false),200)}}
                    disabled={isReadOnly('general')} 
                    className="w-full border-2 border-secondary-silver/50 rounded-xl p-3 pl-10 focus:ring-4 focus:ring-primary-gold/20 focus:border-primary-gold outline-none text-neutral-dark placeholder-neutral-medium/50 transition-all font-medium shadow-sm" 
                    placeholder="พิมพ์ชื่อเพื่อค้นหา หรือคลิกเพื่อเลือก..."
                    autoComplete="off"
                 />
                 <Search className="absolute left-3.5 top-3.5 text-secondary-silver w-5 h-5" />
               </div>
               {showEmployeeDropdown && (
                 <div className="absolute z-10 w-full bg-white border border-secondary-silver shadow-2xl max-h-60 overflow-auto mt-2 rounded-xl animate-in fade-in slide-in-from-top-2">
                   {employeeList.filter(e=>(e.name || "").toLowerCase().includes(formData.employeeName.toLowerCase())).map(emp=>(
                     <div 
                        key={emp.id} 
                        onMouseDown={(e) => { e.preventDefault(); selectEmployee(emp); }} 
                        className="p-4 hover:bg-secondary-cream/50 cursor-pointer border-b border-secondary-silver/30 last:border-0 text-sm flex justify-between items-center group transition-colors"
                     >
                        <span className="font-bold text-neutral-dark group-hover:text-primary-navy text-base">{emp.name}</span> 
                        <span className="text-xs font-bold text-primary-navy bg-accent-sand/30 px-2.5 py-1 rounded-md">{emp.position}</span>
                     </div>
                   ))}
                   {employeeList?.length === 0 && <div className="p-4 text-center text-neutral-medium text-xs">ไม่พบข้อมูล (ต้อง Sync ก่อน)</div>}
                 </div>
               )}
             </div>
             <InputField label="รหัส (ID)" value={formData.employeeId} disabled/>
             <InputField label="ตำแหน่ง (Position)" value={formData.position} disabled/>
             <InputField label="แผนก (Department)" value={formData.department} disabled/>
             <InputField type="text" label="วันเริ่มงาน (Start Date)" name="startDate" value={formData.startDate} onChange={handleInputChange} disabled={!isEmployeeInfoEditable()} placeholder="DD/MM/YYYY"/>
             <InputField type="text" label="ครบกำหนด (Due Date)" name="dueProbationDate" value={formData.dueProbationDate} onChange={handleInputChange} disabled={!isEmployeeInfoEditable()} placeholder="DD/MM/YYYY"/>
          </div>
          {isReadOnly('general') && <LockOverlay/>}
      </div>

      {/* 2. Evaluation Section */}
      <div className="bg-white border border-secondary-silver/50 rounded-2xl p-8 relative shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-primary-navy rounded-l-2xl"></div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-secondary-silver/30 pb-4 gap-4">
             <h3 className="font-bold text-xl text-primary-navy flex items-center">
                <div className="p-2 bg-secondary-cream rounded-lg mr-3 text-primary-navy shadow-sm"><ClipboardList size={24}/></div>
                การประเมินผล (Evaluation)
             </h3>
             <div className="flex gap-2 text-xs font-bold">
               <span className="px-3 py-1 bg-red-100 text-red-600 rounded-full border border-red-200">1-2: น้อย</span>
               <span className="px-3 py-1 bg-secondary-cream text-secondary-darkgold rounded-full border border-secondary-darkgold/20">3-4: ปานกลาง</span>
               <span className="px-3 py-1 bg-primary-navy text-white rounded-full shadow-sm">5-7: ดีมาก</span>
             </div>
          </div>
          
          <div className="space-y-3">
             {evaluationTopics.map((topic, index) => (
               <div key={topic.id} className={`p-5 rounded-xl border transition-all duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-secondary-cream/20'} hover:border-primary-gold/50 hover:shadow-md border-secondary-silver/30`}>
                  <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-primary-gold text-lg bg-primary-gold/10 px-2 rounded-md">{topic.id}.</span>
                        <p className="font-bold text-neutral-dark text-base">{topic.t}</p>
                      </div>
                      <p className="text-xs text-neutral-medium pl-9">น้ำหนักคะแนน (Weight): <span className="font-bold text-primary-navy bg-secondary-cream px-1.5 rounded">{topic.weight}</span></p>
                    </div>
                    
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5, 6, 7].map((num) => {
                        const isSelected = formData.ratings[topic.id] === num;
                        let colorClass = "hover:bg-gray-100 border-gray-200 text-gray-400"; 
                        if (isSelected) {
                           if (num <= 2) colorClass = "bg-red-500 border-red-500 text-white shadow-md ring-2 ring-red-200";
                           else if (num <= 4) colorClass = "bg-secondary-darkgold border-secondary-darkgold text-white shadow-md ring-2 ring-yellow-100";
                           else colorClass = "bg-primary-navy border-primary-navy text-white shadow-md ring-2 ring-blue-100";
                        }
                        return (
                          <button 
                            key={num} 
                            onClick={() => handleRatingChange(topic.id, num)} 
                            disabled={isReadOnly('general')} 
                            className={`w-10 h-10 rounded-lg text-sm font-bold border transition-all duration-200 ${colorClass} ${isSelected ? 'scale-110 z-10' : 'scale-100'}`}
                          >
                            {num}
                          </button>
                        );
                      })}
                    </div>
                    
                    <div className="w-20 text-right hidden md:block">
                        <span className={`text-sm font-bold px-3 py-1.5 rounded-lg border ${formData.ratings[topic.id] ? 'bg-secondary-cream text-primary-navy border-primary-gold' : 'bg-gray-50 text-gray-300 border-gray-100'}`}>
                          {formData.ratings[topic.id] ? ((topic.weight / 7) * formData.ratings[topic.id]).toFixed(2) : '-'}
                        </span>
                    </div>
                  </div>
               </div>
             ))}
          </div>
          
          {/* Total Score Section */}
          <div className="mt-8 bg-primary-navy rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
             <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary-gold/20 rounded-full -ml-10 -mb-10 blur-2xl"></div>
             
             <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="flex items-center gap-5 border-r border-white/10 pr-8">
                   <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm shadow-inner"><Calculator size={32} className="text-primary-gold"/></div>
                   <div>
                      <p className="text-secondary-silver text-xs font-bold uppercase tracking-widest mb-1 opacity-80">คะแนนรวม (Total Score)</p>
                      <div className="flex items-baseline gap-2">
                         <span className="text-5xl font-black tracking-tight drop-shadow-md">{totalScore.toFixed(2)}</span>
                         <span className="text-xl text-secondary-silver font-medium">/ 100</span>
                      </div>
                   </div>
                </div>
                <div className="flex items-center gap-5 pl-4">
                   <div>
                      <p className="text-secondary-silver text-xs font-bold uppercase tracking-widest mb-1 opacity-80">คะแนนเฉลี่ย (Mean Rating)</p>
                      <div className="flex items-baseline gap-3">
                         <span className="text-4xl font-bold text-primary-gold drop-shadow-md">{avgScore.toFixed(2)}</span>
                         <span className="text-sm bg-white/10 px-2 py-1 rounded text-secondary-silver border border-white/10">เต็ม 7.00</span>
                      </div>
                   </div>
                </div>
             </div>
          </div>

          {isReadOnly('general') && <LockOverlay/>}
      </div>

      {/* 3. Summary Section */}
      <div className="bg-white border border-secondary-silver/50 rounded-2xl p-8 relative shadow-lg hover:shadow-xl transition-shadow duration-300">
         <div className="absolute top-0 left-0 w-1.5 h-full bg-green-600 rounded-l-2xl"></div>
         <h3 className="font-bold text-xl mb-6 text-primary-navy flex items-center border-b border-secondary-silver/30 pb-3">
            <div className="p-2 bg-secondary-cream rounded-lg mr-3 text-green-600 shadow-sm"><CheckCircle size={24}/></div>
            สรุปผล (Summary)
         </h3>
         
         <div className="relative mb-10 space-y-4"> 
             {/* 1. ผ่านการทดลองงาน */}
             <div 
                onClick={() => handleOpinionChange('pass')} 
                className={`p-4 border-2 rounded-xl flex items-center gap-4 cursor-pointer transition-all duration-200 ${formData.passProbation ? 'bg-secondary-cream border-primary-gold shadow-md' : 'bg-white border-gray-100 hover:border-primary-gold/50'}`}
             >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${formData.passProbation ? 'bg-primary-navy border-primary-navy text-white' : 'border-gray-300 text-transparent'}`}>
                    <CheckCircle size={14}/>
                </div>
                <span className={`font-bold text-lg ${formData.passProbation ? 'text-primary-navy' : 'text-neutral-medium'}`}>ผ่านการทดลองงาน (Pass probation)</span>
             </div>

             {/* 2. ไม่ผ่านการทดลองงาน + ช่องกรอก */}
             <div 
                onClick={() => handleOpinionChange('notPass')} 
                className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${formData.notPassProbation ? 'bg-red-50 border-red-400 shadow-md' : 'bg-white border-gray-100 hover:border-red-300'}`}
             >
                <div className="flex items-center gap-4 mb-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${formData.notPassProbation ? 'bg-red-500 border-red-500 text-white' : 'border-gray-300 text-transparent'}`}>
                        <CheckCircle size={14}/>
                    </div>
                    <span className={`font-bold text-lg ${formData.notPassProbation ? 'text-red-700' : 'text-neutral-medium'}`}>ไม่ผ่านการทดลองงาน (Not pass probation)</span>
                </div>
                
                {formData.notPassProbation && (
                    <div className="ml-10 mt-2 animate-in slide-in-from-top-2">
                        <label className="text-xs text-red-600 font-bold mb-1 block">ระบุเหตุผล (Reason):</label>
                        <input 
                            type="text" 
                            name="notPassReason"
                            value={formData.notPassReason}
                            onChange={handleInputChange}
                            onClick={(e) => e.stopPropagation()} 
                            disabled={isReadOnly('general')}
                            className="w-full border-b-2 border-red-200 bg-transparent py-1 text-primary-navy focus:border-red-500 outline-none transition-colors"
                            placeholder="พิมพ์สาเหตุที่ไม่ผ่าน..."
                        />
                    </div>
                )}
             </div>

            {/* 3. อื่นๆ + ช่องกรอก */}
            <div 
                onClick={() => handleOpinionChange('other')} 
                className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${formData.otherOpinion ? 'bg-blue-50 border-accent-royalblue shadow-md' : 'bg-white border-gray-100 hover:border-accent-royalblue/50'}`}
             >
                <div className="flex items-center gap-4 mb-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${formData.otherOpinion ? 'bg-accent-royalblue border-accent-royalblue text-white' : 'border-gray-300 text-transparent'}`}>
                        <CheckCircle size={14}/>
                    </div>
                    <span className={`font-bold text-lg ${formData.otherOpinion ? 'text-accent-royalblue' : 'text-neutral-medium'}`}>อื่นๆ (Other)</span>
                </div>

                {formData.otherOpinion && (
                    <div className="ml-10 mt-2 animate-in slide-in-from-top-2">
                        <label className="text-xs text-accent-royalblue font-bold mb-1 block">รายละเอียด (Details):</label>
                        <input 
                            type="text" 
                            name="otherOpinionText"
                            value={formData.otherOpinionText}
                            onChange={handleInputChange}
                            onClick={(e) => e.stopPropagation()}
                            disabled={isReadOnly('general')}
                            className="w-full border-b-2 border-blue-200 bg-transparent py-1 text-primary-navy focus:border-accent-royalblue outline-none transition-colors"
                            placeholder="ระบุความเห็นเพิ่มเติม..."
                        />
                    </div>
                )}
             </div>

             {isReadOnly('general') && <LockOverlay text=""/>}
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6 border-t-2 border-secondary-silver/20">
            <SignatureBlock 
              role="ผู้ประเมิน (Assessor)" 
              signatureData={formData.assessorSign} 
              onSignClick={()=>openSignaturePad('assessor')} 
              isActive={canEdit('general')} 
              isSigned={!!formData.assessorSign} 
            />
            <SignatureBlock 
              role={appSettings.role_hr_title || "ฝ่ายบุคคล (HR)"} 
              signatureData={formData.hrSign} 
              onSignClick={()=>openSignaturePad('hr')} 
              isActive={canEdit('hr')} 
              isSigned={!!formData.hrSign} 
              hasComment 
              commentVal={formData.hrOpinion} 
              onCommentChange={handleHROpinionChange} 
              commentDisabled={!canEdit('hr')} 
            />
            <SignatureBlock 
              role={appSettings.role_approver_title || "ผู้อนุมัติ (Approver)"} 
              signatureData={formData.approverSign} 
              onSignClick={()=>openSignaturePad('approver')} 
              isActive={canEdit('approver')} 
              isSigned={!!formData.approverSign} 
            />
         </div>
      </div>
      
      {signatureModalOpen && <SignatureModal onSave={handleSaveSignature} onClose={() => setSignatureModalOpen(false)} title={`ลงชื่อ: ${signTarget === 'assessor' ? 'ผู้ประเมิน' : signTarget === 'hr' ? (appSettings.role_hr_title || 'ฝ่ายบุคคล') : (appSettings.role_approver_title || 'ผู้อนุมัติ')}`} />}
    </div>
  );
};

const EmployeeManagementModal = ({ onClose, currentEmployees, onRefresh, setGlobalLoading }) => {
  const [sheetId, setSheetId] = useState("13ko9sbzz9_RlBqvb02g-A6_Tc3sMq1YP7-CjlhGKB9E");
  const [sheetName, setSheetName] = useState("");
  const [headers, setHeaders] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [tab, setTab] = useState('list');
  const [selectedIds, setSelectedIds] = useState([]); 
  
  const [mapping, setMapping] = useState({
    id: 0,
    name: 4,
    position: 11,
    section: 10,
    department: 9,
    startDate: 56,
    dueProbation: 57
  });

  const appFields = [
    { key: 'id', label: 'รหัสพนักงาน (ID)' },
    { key: 'name', label: 'ชื่อ-นามสกุล (Name)' },
    { key: 'position', label: 'ตำแหน่ง (Position)' },
    { key: 'section', label: 'ส่วนงาน (Section)' },
    { key: 'department', label: 'แผนก (Department)' },
    { key: 'startDate', label: 'วันเริ่มงาน (Start Date)' },
    { key: 'dueProbation', label: 'วันครบกำหนด (Due Date)' },
  ];

  const fetchHeaders = async () => {
    if (!sheetId) return alert("Please enter Sheet ID");
    setGlobalLoading(true);
    setIsLoading(true);
    
    try {
      const res = await apiCall({ 
        action: 'previewSheet', 
        sheetId: sheetId.trim(), 
        sheetName: sheetName.trim() 
      });

      if (res.error) throw new Error(res.error);
      
      // 🛡️ FIX: เติม || [] เพื่อกันค่า undefined
      setHeaders(res.headers || []); 
      setRawRows(res.rows || []);
      setTab('config');
      
    } catch (error) {
      console.error(error);
      alert("ไม่สามารถดึงข้อมูลได้: " + error.message);
    } finally { 
      setIsLoading(false); 
      setGlobalLoading(false);
    }
  };

  const getPreviewData = () => {
    const mappedRows = rawRows.map(row => {
      const mappedRow = {};
      appFields.forEach(field => {
        const colIndex = mapping[field.key];
        mappedRow[field.key] = row[colIndex] || "";
      });
      return mappedRow;
    }).filter(r => r.id && r.id.trim() !== ""); 

    const uniqueMap = new Map();
    mappedRows.forEach(item => {
        if (!uniqueMap.has(item.id)) {
            uniqueMap.set(item.id, item);
        }
    });
    return Array.from(uniqueMap.values());
  }; 

  const confirmSync = async () => {
    const dataToSync = getPreviewData();
    if(dataToSync.length === 0) return alert("ไม่มีข้อมูลที่สามารถนำเข้าได้");
    
    setGlobalLoading(true); 
    setIsLoading(true); 

    try {
      for (const emp of dataToSync) {
         await apiCall({ action: 'syncEmployees', ...emp });
      }

      await onRefresh(); 
      alert(`✅ ดำเนินการเรียบร้อย`);
      setTab('list');
      setRawRows([]);
      setHeaders([]);
    } catch (error) {
      alert("❌ เกิดข้อผิดพลาด: " + error.message);
    } finally { 
      setIsLoading(false); 
      setGlobalLoading(false); 
    }
  };

  const deleteEmployee = async (id) => {
    if(!confirm(`ต้องการลบข้อมูลพนักงานรหัส ${id} ใช่หรือไม่?`)) return;
    setGlobalLoading(true);
    try {
      await apiCall({ action: 'deleteEmployee', id: id });
      await onRefresh();
    } catch (error) {
      alert("❌ เกิดข้อผิดพลาด: " + error.message);
    } finally { setGlobalLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-neutral-dark/60 flex items-center justify-center backdrop-blur-md p-4 animate-in fade-in zoom-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden border border-secondary-silver/50">
        
        <div className="p-5 border-b border-secondary-silver bg-white flex justify-between items-center">
           <div>
             <h3 className="font-bold text-xl text-primary-navy flex items-center gap-2"><Users className="text-primary-gold" size={24}/> จัดการข้อมูลพนักงาน</h3>
             <p className="text-xs text-neutral-medium mt-1">Employee Data Management</p>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-red-50 rounded-full text-secondary-silver hover:text-red-500 transition-colors"><X size={24}/></button>
        </div>

        <div className="flex border-b border-secondary-silver bg-secondary-cream/30">
           <button onClick={()=>setTab('list')} className={`flex-1 py-4 font-bold text-sm transition-all relative ${tab==='list' ? 'text-primary-navy bg-white' : 'text-neutral-medium hover:bg-white/50'}`}>
              <span className="flex items-center justify-center gap-2">1. รายชื่อพนักงาน ({currentEmployees.length})</span>
              {tab === 'list' && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary-gold rounded-t-full"></div>}
           </button>
           <button onClick={()=>setTab('sync')} className={`flex-1 py-4 font-bold text-sm transition-all relative ${tab==='sync' || tab==='config' ? 'text-primary-navy bg-white' : 'text-neutral-medium hover:bg-white/50'}`}>
              <span className="flex items-center justify-center gap-2">2. ดึงข้อมูล (Import)</span>
              {(tab === 'sync' || tab === 'config') && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary-gold rounded-t-full"></div>}
           </button>
        </div>

        <div className="flex-1 overflow-y-auto p-0 bg-neutral-light/20">
           
           {tab === 'list' && (
             <div className="p-6">
               {/* Bulk Delete Bar */}
               {selectedIds.length > 0 && (
                 <div className="mb-6 bg-red-50 border border-red-100 p-3 rounded-xl flex justify-between items-center animate-in fade-in slide-in-from-top-2 bg-white shadow-md">
                    <div className="flex items-center gap-3">
                       <div className="bg-red-100 p-2 rounded-lg text-red-600"><Trash2 size={20}/></div>
                       <span className="text-red-800 font-bold">เลือกแล้ว {selectedIds.length} รายการ</span>
                    </div>
                    <button className="bg-red-600 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-red-700 transition-all hover:shadow-lg flex items-center gap-2">
                        ยืนยันลบ ({selectedIds.length})
                    </button>
                 </div>
               )}

               {currentEmployees.length === 0 ? (
                 <div className="text-center py-24 text-neutral-medium flex flex-col items-center gap-4">
                    <div className="p-4 bg-secondary-silver/20 rounded-full"><Users size={48} className="text-secondary-silver"/></div>
                    <p>ยังไม่มีข้อมูลพนักงาน</p>
                 </div>
               ) : (
                 <div className="bg-white rounded-xl shadow-sm border border-secondary-silver/50 overflow-hidden">
                   <table className="w-full text-left">
                      <thead className="bg-secondary-cream/50 text-xs uppercase text-primary-navy font-bold border-b border-secondary-silver/50">
                        <tr>
                          <th className="p-4 w-12 text-center"></th>
                          <th className="p-4">ID</th><th className="p-4">Name</th><th className="p-4">Position</th><th className="p-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-secondary-silver/30 text-sm">
                        {currentEmployees.map(emp => (
                          <tr key={emp.id} className={`hover:bg-secondary-cream/30 transition-colors ${selectedIds.includes(emp.id) ? 'bg-secondary-cream/50' : ''}`}>
                            <td className="p-4 text-center"></td>
                            <td className="p-4 font-mono font-bold text-primary-navy">{emp.id}</td>
                            <td className="p-4 font-bold text-neutral-dark">{emp.name}</td>
                            <td className="p-4 text-neutral-medium"><span className="bg-neutral-light px-2 py-1 rounded text-xs font-bold">{emp.position}</span></td>
                            <td className="p-4 text-right"><button onClick={()=>deleteEmployee(emp.id)} disabled={isLoading} className="text-secondary-silver hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-all"><Trash2 size={18}/></button></td>
                          </tr>
                        ))}
                      </tbody>
                   </table>
                 </div>
               )}
             </div>
           )}

           {(tab === 'sync' || tab === 'config') && (
             <div className="flex flex-col h-full">
                <div className="p-8 bg-white border-b border-secondary-silver/50 shadow-sm z-10">
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-primary-navy mb-2 tracking-wider">GOOGLE SHEET ID</label>
                        <input type="text" value={sheetId} onChange={(e)=>setSheetId(e.target.value)} className="w-full border-2 border-secondary-silver/50 rounded-xl p-3 text-sm font-mono focus:ring-4 focus:ring-primary-gold/20 focus:border-primary-gold outline-none transition-all" placeholder="Paste Sheet ID here..."/>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-primary-navy mb-2 tracking-wider">SHEET NAME (Optional)</label>
                        <input type="text" value={sheetName} onChange={(e)=>setSheetName(e.target.value)} className="w-full border-2 border-secondary-silver/50 rounded-xl p-3 text-sm focus:ring-4 focus:ring-primary-gold/20 focus:border-primary-gold outline-none transition-all" placeholder="e.g. Sheet1"/>
                      </div>
                   </div>
                   <button onClick={fetchHeaders} disabled={isLoading} className="w-full bg-primary-navy text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-accent-royalblue disabled:opacity-50 flex justify-center items-center gap-2 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5">
                      <TableProperties size={18}/> {isLoading ? 'กำลังเชื่อมต่อ...' : 'เชื่อมต่อและโหลดคอลัมน์ (Connect)'}
                   </button>
                </div>

                {headers.length > 0 && (
                  <div className="flex-1 overflow-y-auto p-8">
                     <div className="mb-8 bg-secondary-cream/30 p-6 rounded-2xl border border-secondary-silver/50">
                        <h4 className="font-bold text-primary-navy mb-4 flex items-center gap-2 text-lg"><Settings size={20} className="text-primary-gold"/> จับคู่คอลัมน์ (Map Columns)</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           {appFields.map(field => (
                             <div key={field.key} className="flex flex-col">
                                <label className="text-xs font-bold text-neutral-medium mb-1">{field.label}</label>
                                <select 
                                  value={mapping[field.key]} 
                                  onChange={(e)=>setMapping({...mapping, [field.key]: parseInt(e.target.value)})}
                                  className="border rounded-lg p-2 text-sm bg-white"
                                >
                                   {headers.map((h, idx) => (
                                     <option key={idx} value={idx}>{h} (Col {idx+1})</option>
                                   ))}
                                </select>
                             </div>
                           ))}
                        </div>
                     </div>
                     <div className="bg-white border border-secondary-silver/50 rounded-xl overflow-hidden shadow-sm">
                        <div className="p-4 bg-gray-50 border-b border-secondary-silver/50 flex justify-between items-center">
                           <span className="font-bold text-primary-navy text-sm">ตัวอย่างข้อมูล (Preview)</span>
                           <button onClick={confirmSync} disabled={isLoading} className="bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-green-700 shadow-md flex items-center gap-2 transition-all hover:-translate-y-0.5">
                              <UploadCloud size={18}/> {isLoading ? 'Importing...' : 'ยืนยันนำเข้า (Confirm)'}
                           </button>
                        </div>
                        <div className="overflow-x-auto">
                           <table className="w-full text-left text-xs">
                              <thead className="bg-gray-100 font-bold text-gray-600 border-b">
                                 <tr>
                                    {appFields.map(f => <th key={f.key} className="p-3">{f.label}</th>)}
                                 </tr>
                              </thead>
                              <tbody>
                                 {getPreviewData().slice(0, 5).map((row, i) => (
                                    <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                                       {appFields.map(f => <td key={f.key} className="p-3">{row[f.key]}</td>)}
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                           <div className="p-2 text-center text-xs text-gray-400">แสดง 5 รายการแรกจากทั้งหมด {rawRows.length} รายการ</div>
                        </div>
                     </div>
                  </div>
                )}
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

// --- Helper Components ---
const StatCard = ({ label, value, icon, bgClass, subText }) => (
  <div className={`p-6 rounded-2xl shadow-lg border border-white/20 flex items-center justify-between hover:scale-[1.02] transition-transform duration-300 ${bgClass}`}>
     <div>
        <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">{label}</p>
        <p className="text-4xl font-black">{value}</p>
        {subText && <p className="text-[10px] opacity-60 mt-1 uppercase tracking-wide">{subText}</p>}
     </div>
     <div className="p-4 bg-white/20 rounded-xl backdrop-blur-sm shadow-inner">{icon}</div>
  </div>
);

const StatusBadge = ({ status, size = "md" }) => {
   const styles = { 
     draft: "bg-gray-100 text-gray-500 border-gray-200", 
     pending_hr: "bg-primary-gold/10 text-primary-navy border-primary-gold/30", 
     pending_approval: "bg-secondary-darkgold/10 text-secondary-darkgold border-secondary-darkgold/30", 
     completed: "bg-green-50 text-green-700 border-green-200" 
   };
   const labels = { draft: "Draft", pending_hr: "Pending HR", pending_approval: "Pending CEO", completed: "Completed" };
   const px = size === "lg" ? "px-4 py-1.5 text-sm" : "px-3 py-1 text-[10px]";
   return <span className={`${px} rounded-full font-bold uppercase border ${styles[status] || styles.draft} whitespace-nowrap shadow-sm tracking-wide`}>{labels[status] || status}</span>;
};

const ScoreBadge = ({ ratings }) => {
   let total = 0; if(ratings) Object.keys(ratings).forEach(k=> total += (([1,2,3].includes(parseInt(k))?15:[4,5,6,7].includes(parseInt(k))?10:5)/7) * ratings[k]);
   const colorClass = total >= 60 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200';
   return <div className="flex flex-col items-center"><span className={`text-sm font-bold px-3 py-1 rounded-lg border ${colorClass}`}>{total.toFixed(2)}</span></div>;
};

const InputField = ({ label, value, onChange, name, type="text", disabled, placeholder }) => (
  <div>
    <label className="text-xs text-neutral-medium font-bold mb-2 block uppercase tracking-wider">{label}</label>
    <input 
      type={type} 
      name={name} 
      value={value || ''} 
      onChange={onChange} 
      disabled={disabled} 
      placeholder={placeholder} 
      className="w-full border-2 border-secondary-silver/50 rounded-xl p-3 bg-white text-neutral-dark focus:ring-4 focus:ring-primary-gold/20 focus:border-primary-gold outline-none disabled:bg-gray-50 disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed transition-all font-medium"
    />
  </div>
);

const LockOverlay = ({ text = "View Only" }) => (
  <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] cursor-not-allowed z-10 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300"><span className="bg-primary-navy text-white text-xs px-4 py-2 rounded-full shadow-xl font-bold flex items-center gap-2 transform scale-110"><CheckCircle size={14}/> {text}</span></div>
);

const SignatureBlock = ({ role, signatureData, onSignClick, isActive, isSigned, hasComment, commentVal, onCommentChange, commentDisabled }) => (
  <div className={`p-6 border-2 rounded-2xl relative transition-all duration-300 ${isActive ? 'ring-4 ring-primary-gold/20 border-primary-gold bg-white shadow-lg' : 'bg-gray-50/50 border-secondary-silver/50'}`}>
     <div className="font-bold text-sm mb-4 text-primary-navy flex items-center gap-2 uppercase tracking-wide border-b border-gray-100 pb-2"><PenTool size={16} className="text-primary-gold"/> {role}</div>
     {hasComment && (
       <div className="mb-4">
         <p className="text-xs text-neutral-medium font-bold mb-2 uppercase">ความเห็น (Opinion)</p>
         <input type="text" value={commentVal} onChange={onCommentChange} disabled={commentDisabled} placeholder="ระบุความเห็นเพิ่มเติม..." className="w-full border border-secondary-silver rounded-lg p-3 text-sm bg-white focus:ring-2 focus:ring-primary-gold/50 outline-none disabled:bg-gray-50 transition-all"/>
       </div>
     )}
     <div onClick={isActive ? onSignClick : null} className={`h-32 border-2 border-dashed rounded-xl flex items-center justify-center cursor-pointer bg-white transition-all overflow-hidden relative group ${isActive ? 'hover:border-primary-gold hover:bg-secondary-cream/20' : 'border-gray-200'}`}>
        {signatureData ? <img src={signatureData} className="h-full object-contain p-2" alt="sig"/> : <div className="flex flex-col items-center gap-2">
           {isActive ? <div className="bg-primary-navy text-white px-4 py-2 rounded-full text-xs font-bold shadow-md group-hover:scale-105 transition-transform">คลิกเพื่อเซ็นชื่อ</div> : <span className="text-xs text-gray-400 font-medium">รอการลงนาม</span>}
        </div>}
        {isSigned && <div className="absolute top-2 right-2 text-green-500 bg-green-50 p-1 rounded-full"><CheckCircle size={16}/></div>}
     </div>
  </div>
);

const SignatureModal = ({ onSave, onClose, title }) => {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);

    const getCoords = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const startDrawing = (e) => {
        setIsDrawing(true);
        const ctx = canvasRef.current.getContext('2d');
        const { x, y } = getCoords(e);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.strokeStyle = '#000';
    };

    const draw = (e) => {
        if (!isDrawing) return;
        e.preventDefault();
        const ctx = canvasRef.current.getContext('2d');
        const { x, y } = getCoords(e);
        ctx.lineTo(x, y); ctx.stroke();
    };

    const stopDrawing = () => setIsDrawing(false);
    const clearCanvas = () => { const ctx = canvasRef.current.getContext('2d'); ctx.clearRect(0, 0, 320, 180); };

    return (
        <div className="fixed inset-0 z-[60] bg-primary-navy/80 flex items-center justify-center backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col border-4 border-white ring-4 ring-primary-gold/30">
               <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                  <h3 className="font-bold text-primary-navy flex items-center gap-2"><PenTool size={20} className="text-primary-gold"/> {title}</h3>
                  <button onClick={onClose} className="p-2 hover:bg-red-100 rounded-full text-gray-400 hover:text-red-500 transition-colors"><X size={20}/></button>
               </div>
               <div className="p-8 bg-white flex justify-center bg-[url('https://www.transparenttextures.com/patterns/graphy.png')]">
                   <canvas ref={canvasRef} width={320} height={180} className="border-2 border-dashed border-primary-navy/20 cursor-crosshair bg-white rounded-2xl touch-none shadow-inner" onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}/>
               </div>
               <div className="p-5 flex justify-end gap-3 border-t border-gray-100 bg-gray-50">
                  <button onClick={clearCanvas} className="text-neutral-medium text-sm hover:bg-white hover:text-red-500 px-5 py-2.5 rounded-xl transition-all font-bold">ล้าง (Clear)</button>
                  <button onClick={() => onSave(canvasRef.current.toDataURL())} className="bg-primary-navy text-white px-8 py-2.5 rounded-xl text-sm font-bold hover:bg-accent-royalblue shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">ยืนยัน (Confirm)</button>
               </div>
            </div>
        </div>
    )
};

// --- sendGmailNotification Function ---
const sendGmailNotification = async (employeeName, currentStatus, nextStatus, evalId, settings) => {
  let toEmail = '';
  let subject = '';
  let messageHtml = '';
  let signRole = ''; 

  // URL ของหน้าเว็บ GitHub Pages
  const baseUrl = 'https://philm003.github.io/CMT-HRD-EvaluationSystem'; 

  // ใช้ค่าจาก Settings (พร้อมชื่อตำแหน่ง)
  const hrTitle = settings?.role_hr_title || 'HR Manager';
  const approverTitle = settings?.role_approver_title || 'CEO';
  
  const emailHR = settings?.email_hr || 'burin.wo@gmail.com';
  const emailApprover = settings?.email_approver || 'burin.wo@gmail.com';

  if (nextStatus === 'pending_hr') {
      toEmail = emailHR; 
      subject = `[Action Required] กรุณาลงนามผลประเมินของ ${employeeName}`;
      messageHtml = `<h3>เรียน ${hrTitle},</h3><p>กรุณาตรวจสอบและลงนามผลการทดลองงานของ <b>${employeeName}</b></p>`;
      signRole = 'hr';
  } 
  else if (nextStatus === 'pending_approval') {
      toEmail = emailApprover; 
      subject = `[Action Required] กรุณาอนุมัติผลประเมินของ ${employeeName}`;
      messageHtml = `<h3>เรียน ${approverTitle},</h3><p>ฝ่ายบุคคลตรวจสอบเรียบร้อยแล้ว โปรดพิจารณาอนุมัติ</p>`;
      signRole = 'approver';
  } 
  else if (nextStatus === 'completed') {
      toEmail = emailHR; // ส่งกลับหา HR เมื่อเสร็จสิ้น
      subject = `[Completed] ผลประเมิน ${employeeName} เสร็จสมบูรณ์`;
      messageHtml = `<p>การประเมินเสร็จสิ้นแล้ว</p>`;
  }

  const magicLink = signRole && evalId ? `${baseUrl}/?eval_id=${evalId}&sign_role=${signRole}` : '';

  if (magicLink) {
    messageHtml += `<br/><a href="${magicLink}" style="background-color: #1e293b; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">คลิกเพื่อดำเนินการต่อ (Click Here)</a>`;
  }

  try {
        await apiCall({
            action: 'sendEmail', 
            to: toEmail,
            subject: subject,
            html: messageHtml 
        });
        console.log('Email sent successfully to ' + toEmail);
    } catch (error) {
      console.error('Email error:', error);
      alert('❌ ส่งอีเมลไม่สำเร็จ (แต่บันทึกข้อมูลแล้ว)');
  }
};

// --- handlePrint Function ---
const handlePrint = (data, totalScore, avgScore, settings) => {
  const printWindow = window.open('', '_blank');
  
  const hrTitle = settings?.role_hr_title || 'ฝ่ายทรัพยากรบุคคล';
  const approverTitle = settings?.role_approver_title || 'ประธานเจ้าหน้าที่บริหาร';

  const parseDate = (dateStr) => {
      if (!dateStr) return { d:'', m: '', y: '' };
      try {
        const d = new Date(dateStr);
        return { 
            d: d.getDate(),
            m: d.toLocaleDateString('th-TH', { month: 'long' }), 
            y: d.getFullYear() + 543 
        };
      } catch (e) { return { d:'', m: '', y: '' }; }
  };

  const startD = parseDate(data.startDate);
  const dueD = parseDate(data.dueProbationDate);
  const today = new Date();
  const printDateStr = `${today.getDate()} ${today.toLocaleDateString('th-TH', { month: 'long' })} ${today.getFullYear() + 543}`;

const htmlContent = `
    <!DOCTYPE html>
    <html lang="th">
    <head>
        <meta charset="UTF-8">
        <title>Probation Evaluation Form</title>
        <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700&display=swap" rel="stylesheet">
        <style>
            /* --- Reset & Base --- */
            * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            body { 
                font-family: 'Sarabun', sans-serif; 
                font-size: 12px; 
                margin: 0; 
                padding: 0; 
                background: #f0f0f0; /* สีพื้นหลังเว็ป (เวลาไม่ปริ้น) ให้เห็นกระดาษชัดๆ */
                color: #000; 
                line-height: 1.3; 
            }

            /* --- Page Setup (A4) --- */
            @page { size: A4; margin: 0; }
            
            .page-a4 {
                width: 210mm;
                min-height: 297mm;
                margin: 0 auto;
                background: white;
                padding: 10mm; /* ระยะขอบกระดาษขาว */
                display: flex;
                flex-direction: column;
            }

            /* --- Frame Border (เส้นกรอบ) --- */
            .frame-border {
                border: 2px solid #000; /* เส้นกรอบสีดำ */
                flex-grow: 1; /* ยืดให้เต็มความสูงกระดาษ */
                padding: 15px; /* ระยะห่างจากเส้นกรอบถึงเนื้อหา */
                display: flex;
                flex-direction: column;
            }

            /* --- Hide on Print --- */
            @media print { 
                body { background: none; }
                .page-a4 { margin: 0; box-shadow: none; height: 100vh; }
            }

            /* --- Existing Styles (ปรับปรุงเล็กน้อย) --- */
            .container { width: 100%; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            .items-end { align-items: flex-end; }
            .border-b { border-bottom: 1px dotted #000; }
            .w-full { width: 100%; }
            
            .header { display: flex; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
            .company-info { width: 55%; font-size: 11px; padding-right: 10px; border-right: 2px solid #000; }
            .form-title { width: 45%; display: flex; flex-direction: column; justify-content: center; align-items: center; }
            .form-title h1 { font-size: 16px; margin: 0; font-weight: bold; }
            .form-title p { font-size: 12px; margin: 0; }
            
            .info-row { display: flex; margin-bottom: 5px; gap: 10px; align-items: flex-end; }
            .field-label { white-space: nowrap; font-weight: bold; }
            .field-value { border-bottom: 1px dotted #000; flex-grow: 1; text-align: center; color: #0033cc; padding-bottom: 0; height: 18px; }
            
            .attendance-box { border: 1px solid #000; padding: 10px; margin-top: 10px; border-radius: 4px; }
            .attendance-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 5px; }
            .att-item { display: flex; align-items: center; font-size: 11px; }
            .att-input { border-bottom: 1px dotted #000; width: 30px; text-align: center; margin: 0 2px; color: blue; }
            
            table.eval-table { width: 100%; border-collapse: collapse; margin-top: 15px; border: 1px solid #000; }
            table.eval-table th, table.eval-table td { border: 1px solid #000; padding: 4px; vertical-align: middle; }
            table.eval-table th { background-color: #f0f0f0; font-weight: bold; text-align: center; height: 40px; }
            
            .diagonal-cell { position: relative; width: 70px; padding: 0 !important; background: linear-gradient(to top right, transparent 48%, #000 49%, #000 51%, transparent 52%); }
            .diag-top { position: absolute; top: 2px; right: 2px; font-size: 10px; text-align: right; line-height: 1; }
            .diag-bottom { position: absolute; bottom: 2px; left: 2px; font-size: 10px; text-align: left; line-height: 1; }
            
            .rating-circle { display: inline-block; width: 20px; height: 20px; border-radius: 50%; text-align: center; line-height: 18px; margin: 0 auto; }
            .selected { border: 2px solid #000; font-weight: bold; background: #ddd; }
            
            .summary-box { border: 1px solid #000; border-top: none; display: flex; }
            .opinion-part { width: 65%; padding: 10px; border-right: 1px solid #000; }
            .score-part { width: 35%; padding: 10px; display: flex; flex-direction: column; justify-content: center; gap: 10px; }
            
            .checkbox-item { display: flex; align-items: flex-end; margin-bottom: 5px; }
            .checkbox-box { width: 14px; height: 14px; border: 1px solid #000; display: inline-block; margin-right: 5px; position: relative; }
            .checkbox-box.checked::after { content: '✓'; position: absolute; top: -4px; left: 1px; font-size: 16px; font-weight: bold; }
            
            .score-row { display: flex; justify-content: space-between; border: 1px solid #000; padding: 5px; }
            .score-val { font-weight: bold; font-size: 14px; }
            
            .sig-row { display: flex; justify-content: flex-end; margin-top: 20px; align-items: flex-end; }
            .sig-line { border-bottom: 1px dotted #000; width: 180px; text-align: center; position: relative; height: 30px; }
            .sig-img { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); max-height: 40px; max-width: 150px; }
            .sig-label { margin-right: 5px; font-weight: bold; }
            
            .footer { margin-top: 5px; font-size: 9px; text-align: right; color: #555; }
            
            /* ดันส่วนท้าย (HR Section) ให้ไปอยู่ด้านล่างสุดของกรอบเสมอ */
            .bottom-section { margin-top: auto; border: 1px solid #000; border-top: none; padding: 15px; }
        </style>
    </head>
    <body>
        <div class="page-a4">
            <div class="frame-border">
                
                <div class="container">
                    <header class="header">
                        <div class="company-info">
                            <div><strong>บริษัท คาร์เปท เมกเกอร์ (ประเทศไทย) จำกัด และ</strong></div>
                            <div><strong>บริษัท คาร์เปท เมกเกอร์ พี2ดับบลิว (ประเทศไทย) จำกัด</strong></div>
                            <div style="margin-top:2px;">The Carpet Maker (Thailand) Ltd. And</div>
                            <div>The Carpet Maker P2W (Thailand) Ltd.</div>
                        </div>
                        <div class="form-title">
                            <h1>แบบประเมินผลการทดลองงานของพนักงาน</h1>
                            <p>Probation Evaluation Form</p>
                        </div>
                    </header>

                    <div style="margin-bottom: 15px;">
                        <div style="font-weight: bold; margin-bottom: 5px; border-bottom: 1px solid #000; display:inline-block;">ข้อมูลพนักงาน (Employee information)</div>
                        <div class="info-row">
                            <span class="field-label">ชื่อพนักงาน (Name):</span> <span class="field-value" style="flex:2;">${data.employeeName || ''}</span>
                            <span class="field-label">รหัส (ID):</span> <span class="field-value" style="flex:1;">${data.employeeId || ''}</span>
                        </div>
                        <div class="info-row">
                            <span class="field-label">ตำแหน่ง (Position):</span> <span class="field-value">${data.position || ''}</span>
                            <span class="field-label">สังกัด (Section):</span> <span class="field-value">${data.section || ''}</span>
                            <span class="field-label">แผนก (Dept):</span> <span class="field-value">${data.department || ''}</span>
                        </div>
                        <div class="info-row">
                            <span class="field-label">เริ่มงานวันที่ (Start):</span> 
                            <span class="field-value" style="width: 50px; flex:none;">${startD.d}</span>
                            <span class="field-label">เดือน:</span> <span class="field-value" style="width: 80px; flex:none;">${startD.m}</span>
                            <span class="field-label">พ.ศ.:</span> <span class="field-value" style="width: 50px; flex:none;">${startD.y}</span>
                            <span style="flex-grow:1;"></span> <span class="field-label">ครบกำหนด (Due):</span> 
                            <span class="field-value" style="width: 50px; flex:none;">${dueD.d}</span>
                            <span class="field-label">เดือน:</span> <span class="field-value" style="width: 80px; flex:none;">${dueD.m}</span>
                            <span class="field-label">พ.ศ.:</span> <span class="field-value" style="width: 50px; flex:none;">${dueD.y}</span>
                        </div>
                    </div>

                    <div class="attendance-box">
                        <div class="flex justify-between" style="border-bottom: 1px solid #ddd; padding-bottom:5px; margin-bottom:5px;">
                            <strong>ข้อมูลสถิติการทำงาน (Time Attendance)</strong>
                            <div style="font-size:11px;">
                                จากวันที่: <span style="border-bottom:1px dotted #000; padding:0 10px;">${data.attendFrom || '-'}</span>
                                ถึงวันที่: <span style="border-bottom:1px dotted #000; padding:0 10px;">${data.attendTo || '-'}</span>
                            </div>
                        </div>
                        <div class="attendance-grid">
                            <div class="att-item">ลาป่วย <span class="att-input">${data.sickLeave?.days || ''}</span> วัน <span class="att-input">${data.sickLeave?.hours || ''}</span> ชม.</div>
                            <div class="att-item">ลากิจ <span class="att-input">${data.personalLeave?.days || ''}</span> วัน <span class="att-input">${data.personalLeave?.hours || ''}</span> ชม.</div>
                            <div class="att-item">ลาอื่นๆ <span class="att-input">${data.otherLeave?.days || ''}</span> วัน <span class="att-input">${data.otherLeave?.hours || ''}</span> ชม.</div>
                            <div class="att-item">สาย <span class="att-input">${data.late?.times || ''}</span> ครั้ง <span class="att-input">${data.late?.mins || ''}</span> นาที</div>
                            <div class="att-item">ขาดงาน <span class="att-input">${data.absence?.days || ''}</span> วัน <span class="att-input">${data.absence?.hours || ''}</span> ชม.</div>
                        </div>
                    </div>

                    <div style="margin-top:15px; text-align:center; font-weight:bold; font-size:11px;">
                        เขียนวงกลมล้อมรอบคะแนนที่ประเมินให้ (Write a circle around the rating that is evaluated)
                    </div>

                    <table class="eval-table">
                        <thead>
                            <tr>
                                <th rowspan="2" style="width:35%; text-align:left;">หัวข้อในการประเมิน<br><span style="font-weight:normal; font-style:italic;">(Evaluate Topic)</span></th>
                                <th rowspan="2" class="diagonal-cell">
                                    <div class="diag-top">คะแนน<br>Score</div>
                                    <div class="diag-bottom">น้ำหนัก<br>Weight</div>
                                </th>
                                <th>ใช้ไม่ได้<br>(Bad)<br>1</th>
                                <th>ต้องปรับปรุง<br>(Poor)<br>2</th>
                                <th>พอใช้<br>(Fair)<br>3</th>
                                <th>ดี<br>(Good)<br>4</th>
                                <th>ดีมาก<br>(Very Good)<br>5</th>
                                <th>ดีเยี่ยม<br>(Excellent)<br>6</th>
                                <th>ดีเลิศ<br>(Perfect)<br>7</th>
                                <th rowspan="2" style="width:8%;">คะแนน<br>(Score)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${[
                                {id:1, w:15, t:'ปริมาณงานที่ทำสำเร็จ', e:'(The amount of work accomplished)'},
                                {id:2, w:15, t:'คุณภาพของงานที่ทำสำเร็จ', e:'(The quality of the complete work)'},
                                {id:3, w:15, t:'การปฏิบัติตามคำสั่ง / WI / WP', e:'(Compliance with orders)'},
                                {id:4, w:10, t:'ความสามารถการเรียนรู้งาน', e:'(Ability to learn)'},
                                {id:5, w:10, t:'ความรับผิดชอบในงาน', e:'(Responsibility)'},
                                {id:6, w:10, t:'ความร่วมมือในการทำงานเป็นทีม', e:'(Cooperation / Teamwork)'},
                                {id:7, w:10, t:'การตรงต่อเวลา', e:'(Punctuality)'},
                                {id:8, w:5,  t:'ความปลอดภัยและชีวอนามัย', e:'(Safety and Health)'},
                                {id:9, w:5,  t:'ความซื่อสัตย์ / ทัศนคติ', e:'(Honesty / Attitude)'},
                                {id:10, w:5, t:'การปฏิบัติตามกฎระเบียบ', e:'(Compliance with rules)'}
                            ].map(topic => {
                                const score = data.ratings[topic.id];
                                const calcScore = score ? ((topic.w / 7) * score).toFixed(2) : '';
                                let tds = '';
                                for(let i=1; i<=7; i++) {
                                    tds += `<td class="text-center"><div class="rating-circle ${score == i ? 'selected' : ''}">${i}</div></td>`;
                                }
                                return `
                                    <tr>
                                        <td style="text-align: left;">
                                            <div>${topic.id}. ${topic.t}</div>
                                            <div style="font-style:italic; font-size:10px; color:#555;">${topic.e}</div>
                                        </td>
                                        <td class="text-center">${topic.w}</td>
                                        ${tds}
                                        <td class="text-center font-bold">${calcScore}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                        <tfoot>
                            <tr style="background:#f9f9f9;">
                                <td class="text-right font-bold">คะแนนเต็ม (Full marks)</td>
                                <td class="text-center font-bold">100</td>
                                <td colspan="7"></td>
                                <td class="text-center font-bold" style="font-size:14px;">${totalScore ? totalScore.toFixed(2) : ''}</td>
                            </tr>
                        </tfoot>
                    </table>

                    <div class="summary-box">
                        <div class="opinion-part">
                            <strong>ความเห็น (Opinion) :</strong>
                            <div class="checkbox-item" style="margin-top:5px;">
                                <div class="checkbox-box ${data.passProbation ? 'checked' : ''}"></div> ผ่านการทดลองงาน (Pass probation)
                            </div>
                            <div class="checkbox-item">
                                <div class="checkbox-box ${data.notPassProbation ? 'checked' : ''}"></div> ไม่ผ่านการทดลองงาน (ระบุเหตุผล) : 
                                <span class="border-b" style="width:200px; display:inline-block; color:blue;">${data.notPassReason || ''}</span>
                            </div>
                            <div class="checkbox-item">
                                <div class="checkbox-box ${data.otherOpinion ? 'checked' : ''}"></div> อื่นๆ (Other) : 
                                <span class="border-b" style="width:250px; display:inline-block; color:blue;">${data.otherOpinionText || ''}</span>
                            </div>
                            <div class="sig-row" style="justify-content: flex-start; margin-top:30px;">
                                <span class="sig-label">ลงชื่อผู้ประเมิน (Assessor):</span>
                                <div class="sig-line">
                                    ${data.assessorSign ? `<img src="${data.assessorSign}" class="sig-img">` : ''}
                                </div>
                            </div>
                        </div>
                        <div class="score-part">
                            <div class="score-row">
                                <span>คะแนนรวม (Total):</span>
                                <span class="score-val">${totalScore ? totalScore.toFixed(2) : '-'}</span>
                            </div>
                            <div class="score-row">
                                <div>
                                    <div>คะแนนเฉลี่ย</div>
                                    <div style="font-size:9px; color:#666;">(รวม / 7)</div>
                                </div>
                                <span class="score-val">${avgScore ? avgScore.toFixed(2) : '-'}</span>
                            </div>
                        </div>
                    </div>
                </div> 

                <div class="bottom-section">
                    <div class="flex" style="margin-bottom:25px;">
                        <span class="sig-label" style="min-width:150px;">ความเห็น HR:</span>
                        <span class="border-b w-full" style="color:blue;">${data.hrOpinion || ''}</span>
                    </div>
                    <div class="flex justify-between" style="padding: 0 50px;">
                        <div class="text-center">
                            <div class="sig-line" style="margin:0 auto;">
                                ${data.hrSign ? `<img src="${data.hrSign}" class="sig-img">` : ''}
                            </div>
                            <div style="margin-top:5px;">( ${hrTitle} )</div>
                            <div style="font-size:10px;">ลงชื่อ (Sign)</div>
                        </div>
                        <div class="text-center">
                            <div class="sig-line" style="margin:0 auto;">
                                ${data.approverSign ? `<img src="${data.approverSign}" class="sig-img">` : ''}
                            </div>
                            <div style="margin-top:5px;">( ${approverTitle} )</div>
                            <div style="font-size:10px;">ผู้อนุมัติ (Approver)</div>
                        </div>
                    </div>
                </div>

                <div class="footer">
                    Form.FR-RC-007 แก้ไขครั้งที่ 02 เริ่มใช้วันที่ 17 กุมภาพันธ์ 2563 (Printed: ${printDateStr})
                </div>

            </div> </div> <script>
            window.onload = function() { setTimeout(function(){ window.print(); }, 500); }
        </script>
    </body>
    </html>
`;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
};