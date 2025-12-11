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
// const API_URL = 'localhost:5000';
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
    role_approver_title: 'ผู้อนุมัติ (Approver)', // Default value
    sender_name: 'HR Evaluation System'
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
    attendFrom: "",
    attendTo: "",
    role_hr_title: currentSettings.role_hr_title || 'ฝ่ายบุคคล (HR)',
    email_hr: currentSettings.email_hr || '',
    role_approver_title: currentSettings.role_approver_title || 'ผู้อนุมัติ (Approver)',
    email_approver: currentSettings.email_approver || '',
    sender_name: currentSettings.sender_name || 'HR Evaluation System'
  });

  const handleSave = async () => {
    setGlobalLoading(true);
    try {
      await apiCall({
        action: 'evalSaveSettings', 
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
           <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
             <h4 className="font-bold text-primary-navy mb-3 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gray-500 text-white flex items-center justify-center text-xs">0</div>
                ตั้งค่าทั่วไป (General)
             </h4>
             <div className="space-y-4 pl-8">
               <div>
                  <label className="block text-xs font-bold text-neutral-medium mb-1">ชื่อผู้ส่งอีเมล (Sender Name)</label>
                  <input 
                    type="text" 
                    value={formData.sender_name} 
                    onChange={e => setFormData({...formData, sender_name: e.target.value})}
                    className="w-full border border-secondary-silver rounded-lg p-2.5 text-sm focus:border-primary-gold outline-none"
                    placeholder="เช่น HR System, Admin, บริษัท ABC จำกัด"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">ชื่อที่จะแสดงในกล่องจดหมายของผู้รับ (แทนที่อีเมลเปล่าๆ)</p>
               </div>
             </div>
           </div>

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

// ==========================================
// EVALUATION FORM COMPONENT (STRICT SAVE FIX)
// ==========================================
const EvaluationForm = ({ initialData, employeeList = [], currentRole, onBack, onSaveComplete, autoOpenSignRole, setGlobalLoading, appSettings }) => {
  // --- State ---
  const [status, setStatus] = useState(initialData?.status || 'draft');
  const [dbId, setDbId] = useState(initialData?.id || null);
  
  // State สำหรับ Modal
  const [showGuestSuccessModal, setShowGuestSuccessModal] = useState(false); 
  const [showRedirectModal, setShowRedirectModal] = useState(false); 
  
  // --- Initialize Form Data ---
  const initialFormData = {
    employeeName: '', employeeId: '', position: '', section: '', department: '', startDate: '', dueProbationDate: '',
    attendFrom: '', attendTo: '',
    sickLeave: { days: '', hours: '' }, personalLeave: { days: '', hours: '' }, otherLeave: { days: '', hours: '' }, late: { times: '', mins: '' }, absence: { days: '', hours: '' },
    ratings: {},
    passProbation: false, notPassProbation: false, notPassReason: '', otherOpinion: false, otherOpinionText: '',
    assessorSign: '', hrOpinion: '', hrSign: '', approverSign: '', approverOpinion: '' // ✅ เพิ่ม approverOpinion ชัดเจน
  };

  const [formData, setFormData] = useState(() => {
      if (!initialData) return initialFormData;
      return { ...initialFormData, ...initialData, ratings: initialData.ratings || {} };
  });

  // --- Sync Initial Data ---
  useEffect(() => {
    if (initialData) {
      console.log("📥 Syncing Data:", initialData);
      setFormData(prev => ({ ...prev, ...initialData, ratings: initialData.ratings || {} }));
      setStatus(initialData.status || 'draft');
      setDbId(initialData.id);
    }
  }, [initialData]);

  // --- Auto Open Signature (Delayed) ---
  useEffect(() => {
    if (autoOpenSignRole && !signatureModalOpen && status !== 'completed') {
       const isHRTurn = autoOpenSignRole === 'hr' && status === 'pending_hr';
       const isApproverTurn = autoOpenSignRole === 'approver' && status === 'pending_approval';
       const isAssessorTurn = autoOpenSignRole === 'assessor' && (status === 'draft' || status === 'returned');

       if (isHRTurn || isApproverTurn || isAssessorTurn) {
           const timer = setTimeout(() => {
               // openSignaturePad(autoOpenSignRole); 
           }, 800);
           return () => clearTimeout(timer);
       }
    }
  }, [autoOpenSignRole, status]);

  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [signTarget, setSignTarget] = useState(null);
  const [totalScore, setTotalScore] = useState(0);
  const [avgScore, setAvgScore] = useState(0);

  // --- Permission Logic ---
  const isGuest = !!autoOpenSignRole; 
  const canEdit = (section) => {
      if (!isGuest) return true; 
      if (status === 'completed') return false;
      if (autoOpenSignRole === 'assessor') {
         if (section === 'hr' || section === 'approver') return false;
         return true;
      }
      return section === autoOpenSignRole;
  };
  const isReadOnly = (section) => !canEdit(section);

  // --- Helper Calculations ---
  const evaluationTopics = [
    { id: 1, weight: 15, t: 'ปริมาณงานที่ทำสำเร็จจากที่ได้มอบหมาย', e:'(The amount of work accomplished from the assignment)'},
    { id: 2, weight: 15, t: 'คุณภาพของงานที่ทำสำเร็จ', e:'(The quality of the complete work)'},
    { id: 3, weight: 15, t: 'การปฏิบัติตามคำสั่งของผู้บังคับบัญชาหรือตาม WI หรือ WP', e:'(Compliance with orders of supervisors or according to WI or WP)'},
    { id: 4, weight: 10, t: 'ความสามารถการเรียนรู้งานและความเข้าใจในงานที่ทำ', e:'(Ability to learn and understand the work)'},
    { id: 5, weight: 10, t: 'ความไว้วางใจและความรับผิดชอบในงานที่ได้รับมอบหมาย', e:'(Trust and responsibility in assigned work)'},
    { id: 6, weight: 10, t: 'ความร่วมมือในการทำงานเป็นทีม', e:'(Cooperation in Teamwork)'},
    { id: 7, weight: 10, t: 'การตรงต่อเวลาและความสม่ำเสมอในการมาทำงาน', e:'(Punctuality in working, quitting work and Consistency in working)'},
    { id: 8, weight: 5,  t: 'การเอาใจใส่ในการปฏิบัติตามกฎเรื่องความปลอดภัยและชีวอนามัยของบริษัทฯ', e:'(Caring for compliance the safety and health regulations of the company)'},
    { id: 9, weight: 5,  t: 'ความชื่อสัตย์ และทัศนคติที่ดีต่อบริษัท', e:'(Honesty and good attitude towards the company)'},
    { id: 10, weight: 5, t: 'การปฏิบัติตามกฎระเบียบและการรักษาทรัพย์สินของบริษัท', e:'(Compliance with rules and regulations for maintaining company assets)'}
  ];

  useEffect(() => {
    let weightedSum = 0; 
    evaluationTopics.forEach(topic => {
      const r = formData.ratings[topic.id] || 0;
      if(r > 0) weightedSum += (topic.weight * r);
    });
    setTotalScore(weightedSum);
    setAvgScore(weightedSum / 7);
  }, [formData.ratings]);

  // --- Input Handlers ---
  const handleNameSearch = (e) => { setFormData(prev => ({ ...prev, employeeName: e.target.value })); setShowEmployeeDropdown(true); };
  const selectEmployee = (emp) => {
    setFormData(prev => ({ ...prev, employeeName: emp.name, employeeId: emp.id, position: emp.position, section: emp.section, department: emp.department, startDate: emp.startDate, dueProbationDate: emp.dueProbation }));
    setShowEmployeeDropdown(false);
  };
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({ ...prev, [parent]: { ...prev[parent], [child]: value } }));
    } else {
      setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    }
  };
  const handleNestedChange = (category, field, value) => { if (!canEdit('general')) return; setFormData(prev => ({ ...prev, [category]: { ...prev[category], [field]: value } })); };
  const handleRatingChange = (topicId, score) => { if (!canEdit('general')) return; setFormData(prev => ({ ...prev, ratings: { ...prev.ratings, [topicId]: score } })); };
  const handleOpinionChange = (type) => { if (!canEdit('general')) return; setFormData(prev => ({ ...prev, passProbation: type === 'pass' ? !prev.passProbation : false, notPassProbation: type === 'notPass' ? !prev.notPassProbation : false, otherOpinion: type === 'other' ? !prev.otherOpinion : false })); };
  const handleHROpinionChange = (e) => { if (!canEdit('hr')) return; setFormData(prev => ({ ...prev, hrOpinion: e.target.value })); };
  const handleApproverOpinionChange = (e) => { if (!canEdit('approver')) return; setFormData(prev => ({ ...prev, approverOpinion: e.target.value })); };
  
  const openSignaturePad = (target) => {
    if (!canEdit(target)) return alert("⛔ คุณไม่มีสิทธิ์แก้ไขช่องนี้");
    setSignTarget(target);
    setSignatureModalOpen(true);
  };

  const handleConfirmSignature = (dataUrl) => {
     setFormData(prev => ({
         ...prev,
         [signTarget === 'assessor' ? 'assessorSign' : signTarget === 'hr' ? 'hrSign' : 'approverSign']: dataUrl
     }));
     setSignatureModalOpen(false);
  };

  const handleResetStatus = () => {
    if (!confirm("⚠️ ต้องการรีเซ็ตสถานะกลับเป็น Draft หรือไม่?")) return;
    setStatus('draft');
    setFormData(prev => ({ ...prev, assessorSign: '', hrSign: '', approverSign: '' }));
  };

  // ========================================================
  // ✅ LOGIC: Main Save Function (STRICT MODE)
  // ========================================================
  const handleMainSave = async () => {
    if (!formData.employeeName) return alert("❌ กรุณาระบุชื่อพนักงาน");

    // คำนวณสถานะใหม่
    let newStatus = status;
    if (formData.approverSign) newStatus = 'completed';
    else if (formData.hrSign) newStatus = 'pending_approval';
    else if (formData.assessorSign) newStatus = 'pending_hr';
    else newStatus = 'draft';

    setGlobalLoading(true); 
    
    // 1. Force ID & Validation
    const rawId = dbId || formData.id || formData.eva_id;
    
    // 🛡️ CRITICAL FIX: ถ้าเป็น Guest (คนมาเซ็น) ห้ามสร้าง ID ใหม่เด็ดขาด ต้องมี ID เดิมเท่านั้น
    // เพื่อป้องกันการสร้าง Record ใหม่ซ้อนทับอันเดิม
    if (isGuest && (!rawId || rawId === 'undefined')) {
        setGlobalLoading(false);
        alert("❌ ไม่พบ ID ของเอกสาร (Missing Document ID)\n\nระบบไม่สามารถบันทึกได้เนื่องจากลิงก์อาจไม่สมบูรณ์ กรุณาเข้าลิงก์ใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบ");
        return;
    }

    // ถ้าไม่ใช่ Guest (สร้างใหม่) ถึงจะอนุญาตให้ใช้ Date.now()
    const forcedId = rawId ? String(rawId) : String(Date.now()); 
    
    const payload = {
        ...formData,
        id: forcedId,
        eva_id: forcedId,
        status: newStatus,
        lastUpdated: new Date().toISOString(),
        updatedBy: isGuest ? `${autoOpenSignRole} (Guest)` : currentRole,
        action: 'saveEvaluation'
    };

    try {
        console.log("💾 Saving Payload:", payload);
        const response = await apiCall(payload);

        // 🛡️ Double Check Response
        if (!response) throw new Error("Server ไม่ตอบสนอง (No Response)");
        
        // เช็คว่า Backend ตอบกลับมาว่า Success หรือคืนค่า ID กลับมา
        const isSuccess = response.success === true || !!response.id || !!response.eva_id;
        
        if (!isSuccess) {
             console.error("Save Error Response:", response);
             throw new Error(response.message || "บันทึกไม่สำเร็จ (Unknown Error)");
        }
        
        // --- ถ้ามาถึงตรงนี้แปลว่าบันทึกสำเร็จจริง ---
        setDbId(forcedId);
        setStatus(newStatus);
        setFormData(prev => ({ ...prev, ...payload })); 

        // 3. ส่ง Email
        if (newStatus !== status || isGuest) {
            console.log("📨 Sending Email...");
            await sendGmailNotification(formData.employeeName, status, newStatus, forcedId, appSettings);
        }

        setGlobalLoading(false);

        // 4. แยกการทำงานหลังบันทึก
        if (isGuest) {
             setShowGuestSuccessModal(true);
        } else {
             setShowRedirectModal(true);
             setTimeout(() => {
                 onSaveComplete(); 
             }, 3000); 
        }

    } catch (e) {
        setGlobalLoading(false);
        console.error("Save Exception:", e);
        alert("❌ เกิดข้อผิดพลาดในการบันทึก: " + e.message + "\n(กรุณาลองกดบันทึกใหม่อีกครั้ง)");
    }
  };

  // --- Render: Guest Success Modal ---
  if (showGuestSuccessModal) {
      return (
        <div className="fixed inset-0 bg-white z-[60] flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
           <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-xl ring-8 ring-green-50">
              <CheckCircle size={64} className="text-green-600" />
           </div>
           <h1 className="text-3xl font-extrabold text-primary-navy mb-4 text-center">ได้รับการรับรองเรียบร้อย</h1>
           <p className="text-neutral-medium mb-10 text-center text-lg max-w-md">ข้อมูลของท่านถูกบันทึกและส่งอีเมลแจ้งเตือนเรียบร้อยแล้ว</p>
           
           <button onClick={() => { window.location.href = 'https://www.google.com'; }} className="px-10 py-4 bg-primary-navy text-white hover:bg-accent-royalblue font-bold rounded-2xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 flex items-center gap-2">
             <LogOut size={20}/> ออกจากหน้านี้
           </button>
        </div>
      );
  }

  // --- Render: Admin Redirect Modal ---
  if (showRedirectModal) {
      return (
        <div className="fixed inset-0 bg-white/95 backdrop-blur-sm z-[70] flex flex-col items-center justify-center animate-in fade-in duration-300">
           <div className="bg-white p-10 rounded-3xl shadow-2xl border border-secondary-silver flex flex-col items-center max-w-sm w-full transform scale-110">
               <div className="relative mb-6">
                   <div className="w-20 h-20 border-4 border-primary-navy/20 border-t-primary-navy rounded-full animate-spin"></div>
                   <div className="absolute inset-0 flex items-center justify-center">
                        <CheckCircle size={32} className="text-green-500 animate-in zoom-in duration-500"/>
                   </div>
               </div>
               <h2 className="text-2xl font-bold text-primary-navy mb-2">บันทึกข้อมูลสำเร็จ!</h2>
               <p className="text-gray-500 text-sm mb-6">System Saved Successfully</p>
               <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mb-2">
                   <div className="h-full bg-green-500 animate-[width_3s_ease-out_forwards]" style={{width: '0%'}}></div>
               </div>
               <p className="text-xs text-gray-400 font-bold animate-pulse">กำลังพาท่านกลับสู่ Dashboard...</p>
           </div>
        </div>
      );
  }

  // --- Render: Main Form ---
  return (
    <div className={`max-w-5xl mx-auto p-4 md:p-8 animate-in slide-in-from-bottom-4 duration-500 pb-24 ${isGuest ? 'bg-white min-h-screen' : ''}`}>
      
      {/* Header Controls */}
      <div className="flex justify-between items-center mb-6 print:hidden">
        {!isGuest ? (
            <button onClick={onBack} className="flex items-center text-neutral-medium hover:text-primary-navy transition-colors font-bold px-3 py-2 rounded-lg hover:bg-secondary-cream/50">
                <ArrowLeft className="mr-2" size={20}/> กลับหน้า Dashboard
            </button>
        ) : (
            <div className="flex items-center gap-2 text-neutral-medium font-bold px-3 py-2 bg-gray-100 rounded-lg">
               <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div> 
               Guest Access: {autoOpenSignRole?.toUpperCase()}
            </div>
        )}
        
        <div className="flex items-center gap-3">
             <StatusBadge status={status} size="lg" />
             {(status !== 'draft' && currentRole === 'admin') && (
                <button onClick={handleResetStatus} className="flex items-center gap-2 bg-white text-secondary-darkgold border border-secondary-darkgold hover:bg-secondary-cream px-4 py-2 rounded-lg font-bold shadow-sm transition-all text-xs md:text-sm">
                    <RotateCcw size={16}/> Reset
                </button>
            )}
        </div>
      </div>

      <div className="bg-white border border-secondary-silver/50 rounded-2xl p-8 relative shadow-lg mb-8 mt-6 text-center">
          <h1 className="text-3xl font-extrabold text-primary-navy tracking-tight drop-shadow-sm">แบบประเมินผลการทดลองงาน</h1>
          <p className="text-neutral-medium text-lg mt-1 font-medium">Probation Evaluation Form</p>
      </div>

      {/* --- Section 1: Employee Info --- */}
      <div className="bg-white border border-secondary-silver/50 rounded-2xl p-8 relative shadow-lg mb-8 mt-6">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-primary-gold rounded-l-2xl"></div>
          <h3 className="font-bold text-xl mb-6 text-primary-navy flex items-center border-b border-secondary-silver/30 pb-3">
             <div className="p-2 bg-secondary-cream rounded-lg mr-3 text-primary-gold shadow-sm"><User size={24}/></div>
             ข้อมูลพนักงาน (Employee Info)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="relative">
               <label className="text-xs text-neutral-medium font-bold mb-2 block uppercase tracking-wider">ชื่อพนักงาน (Name)</label>
               <input 
                  type="text" name="employeeName" value={formData.employeeName} 
                  onChange={handleNameSearch} 
                  onFocus={()=>{if(employeeList.length>0)setShowEmployeeDropdown(true)}} 
                  onBlur={()=>{setTimeout(()=>setShowEmployeeDropdown(false),200)}}
                  disabled={isReadOnly('general')}
                  className="w-full border-2 border-secondary-silver/50 rounded-xl p-3 focus:ring-4 focus:ring-primary-gold/20 focus:border-primary-gold outline-none font-medium" 
                  placeholder="พิมพ์ชื่อ..."
               />
               {showEmployeeDropdown && (
                 <div className="absolute z-10 w-full bg-white border border-secondary-silver shadow-2xl max-h-60 overflow-auto mt-2 rounded-xl">
                   {employeeList.filter(e=>(e.name || "").toLowerCase().includes(formData.employeeName.toLowerCase())).map(emp=>(
                     <div key={emp.id} onMouseDown={(e) => { e.preventDefault(); selectEmployee(emp); }} className="p-4 hover:bg-secondary-cream/50 cursor-pointer border-b border-secondary-silver/30">
                        <span className="font-bold">{emp.name}</span>
                     </div>
                   ))}
                 </div>
               )}
             </div>
             <InputField label="รหัส (ID)" value={formData.employeeId} disabled/>
             <InputField label="ตำแหน่ง (Position)" value={formData.position} disabled/>
             <InputField label="แผนก (Department)" value={formData.department} disabled/>
             <InputField label="วันเริ่มงาน" value={formData.startDate} name="startDate" onChange={handleInputChange} disabled={isReadOnly('general')}/>
             <InputField label="วันครบกำหนด" value={formData.dueProbationDate} name="dueProbationDate" onChange={handleInputChange} disabled={isReadOnly('general')}/>
             
             <div className="md:col-span-2 mt-4">
                 <label className="text-xs text-neutral-medium font-bold mb-2 block uppercase tracking-wider">ช่วงวันที่เก็บสถิติ</label>
                 <div className="flex gap-4">
                     <div className="flex-1"><InputField type="date" value={formData.attendFrom} name="attendFrom" onChange={handleInputChange} disabled={isReadOnly('general')}/></div>
                     <div className="flex-1"><InputField type="date" value={formData.attendTo} name="attendTo" onChange={handleInputChange} disabled={isReadOnly('general')}/></div>
                 </div>
             </div>
          </div>

          <div className="mt-8 pt-6 border-t border-secondary-silver/30">
             <h4 className="font-bold text-lg text-primary-navy mb-4">ข้อมูลสถิติการทำงาน</h4>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <LeaveInput label="ลาป่วย" name="sickLeave" data={formData.sickLeave} onChange={handleNestedChange} disabled={isReadOnly('general')}/>
                <LeaveInput label="ลากิจ" name="personalLeave" data={formData.personalLeave} onChange={handleNestedChange} disabled={isReadOnly('general')}/>
                <LeaveInput label="ลาอื่นๆ" name="otherLeave" data={formData.otherLeave} onChange={handleNestedChange} disabled={isReadOnly('general')}/>
                <LeaveInput label="มาสาย (ครั้ง/นาที)" name="late" data={formData.late} onChange={handleNestedChange} disabled={isReadOnly('general')} isLate/>
                <LeaveInput label="ขาดงาน" name="absence" data={formData.absence} onChange={handleNestedChange} disabled={isReadOnly('general')} isAbsence/>
             </div>
          </div>
      </div>

      {/* --- Section 2: Evaluation --- */}
      <div className="bg-white border border-secondary-silver/50 rounded-2xl p-8 relative shadow-lg mb-8">
         <div className="absolute top-0 left-0 w-1.5 h-full bg-primary-navy rounded-l-2xl"></div>
         <h3 className="font-bold text-xl mb-6 text-primary-navy flex items-center">
            <ClipboardList className="mr-3 text-primary-navy"/> การประเมินผล (Evaluation)
         </h3>
         <div className="space-y-4">
            {evaluationTopics.map(topic => (
               <div key={topic.id} className="p-4 rounded-xl border border-secondary-silver/30 hover:shadow-md transition-all bg-secondary-cream/10">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                     <div className="flex-1">
                        <span className="font-bold text-primary-navy mr-2" style={{fontSize: '14px'}}>{topic.id}.</span>
                        <span className="font-bold text-neutral-dark " style={{fontSize: '14px'}}>{topic.t}</span><br></br>
                        &emsp;&ensp;<span className="font-bold text-neutral-dark " style={{fontSize: '10px'}}>{topic.e}</span>
                        <span className="text-xs text-neutral-medium ml-2">(Weight: {topic.weight})</span>
                     </div>
                     <div className="flex gap-1.5">
                        {[1,2,3,4,5,6,7].map(num => (
                           <button key={num} onClick={() => handleRatingChange(topic.id, num)} disabled={isReadOnly('general')} className={`w-10 h-10 rounded-lg font-bold border transition-all ${formData.ratings[topic.id]===num ? 'bg-primary-navy text-white scale-110 shadow-lg' : 'bg-white hover:bg-gray-100 text-gray-400'}`}>{num}</button>
                        ))}
                     </div>
                  </div>
               </div>
            ))}
         </div>
         <div className="mt-8 bg-primary-navy rounded-2xl p-6 text-white shadow-xl flex justify-between items-center">
             <div>
                <p className="text-xs font-bold uppercase opacity-80">Total Score</p>
                <p className="text-4xl font-black">{totalScore.toFixed(2)} <span className="text-xl font-medium text-gray-400">/ 700</span></p>
             </div>
             <div>
                <p className="text-xs font-bold uppercase opacity-80">Mean Rating</p>
                <p className="text-3xl font-bold text-primary-gold">{avgScore.toFixed(2)}</p>
             </div>
         </div>
         {isReadOnly('general') && <LockOverlay/>}
      </div>

      {/* --- Section 3: Summary & Signature --- */}
      <div className="bg-white border border-secondary-silver/50 rounded-2xl p-8 relative shadow-lg mb-8">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-green-600 rounded-l-2xl"></div>
          <h3 className="font-bold text-xl mb-6 text-primary-navy flex items-center">
             <CheckCircle className="mr-3 text-green-600"/> สรุปผล (Summary)
          </h3>
          <div className="space-y-3 mb-8">
              <SummaryOption label="ผ่านการทดลองงาน" checked={formData.passProbation} onClick={()=>handleOpinionChange('pass')} disabled={isReadOnly('general')}/>
              <SummaryOption label="ไม่ผ่านการทดลองงาน" checked={formData.notPassProbation} onClick={()=>handleOpinionChange('notPass')} disabled={isReadOnly('general')}>
                  {formData.notPassProbation && <input type="text" value={formData.notPassReason} onChange={handleInputChange} name="notPassReason" onClick={(e) => e.stopPropagation()} className="w-full border-b border-red-300 outline-none text-red-700 mt-2" placeholder="ระบุเหตุผล..."/>}
              </SummaryOption>
              <SummaryOption label="อื่นๆ" checked={formData.otherOpinion} onClick={()=>handleOpinionChange('other')} disabled={isReadOnly('general')}>
                   {formData.otherOpinion && <input type="text" value={formData.otherOpinionText} onChange={handleInputChange} name="otherOpinionText" onClick={(e) => e.stopPropagation()} className="w-full border-b border-blue-300 outline-none text-blue-700 mt-2" placeholder="ระบุความเห็น..."/>}
              </SummaryOption>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6 border-t">
             <SignatureBlock role="ผู้ประเมิน (Assessor)" signatureData={formData.assessorSign} onSignClick={()=>openSignaturePad('assessor')} isActive={canEdit('general') || canEdit('assessor')} isSigned={!!formData.assessorSign} />
             <SignatureBlock role={appSettings.role_hr_title || "ฝ่ายบุคคล (HR)"} signatureData={formData.hrSign} onSignClick={()=>openSignaturePad('hr')} isActive={canEdit('hr')} isSigned={!!formData.hrSign} hasComment commentVal={formData.hrOpinion} onCommentChange={handleHROpinionChange} commentDisabled={isReadOnly('hr')}/>
             <SignatureBlock role={appSettings.role_approver_title || "ผู้อนุมัติ"} signatureData={formData.approverSign} onSignClick={()=>openSignaturePad('approver')} isActive={canEdit('approver')} isSigned={!!formData.approverSign} hasComment commentVal={formData.approverOpinion} onCommentChange={handleApproverOpinionChange} commentDisabled={isReadOnly('approver')}/>
          </div>
      </div>

      {/* --- BOTTOM BAR --- */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-secondary-silver p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] flex justify-center items-center gap-4 z-40 animate-in slide-in-from-bottom-2">
          {/* ✅ เรียกใช้ handlePrint ของไฟล์นี้ */}
          <button onClick={() => handlePrint(formData, totalScore, avgScore, appSettings)} className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-transform hover:-translate-y-1">
             <Printer size={20}/> พิมพ์
          </button>
          <button onClick={handleMainSave} className="flex items-center gap-2 bg-gradient-to-r from-primary-navy to-accent-royalblue hover:from-primary-navy hover:to-primary-navy text-white px-8 py-3 rounded-xl font-bold shadow-xl shadow-blue-900/20 transition-all hover:scale-105">
             <Save size={20}/> บันทึกข้อมูล
          </button>
      </div>
      
      {signatureModalOpen && <SignatureModal onSave={handleConfirmSignature} onClose={() => setSignatureModalOpen(false)} title={`ลงชื่อ: ${signTarget === 'assessor' ? 'ผู้ประเมิน' : signTarget === 'hr' ? (appSettings.role_hr_title || 'ฝ่ายบุคคล') : (appSettings.role_approver_title || 'ผู้อนุมัติ')}`} />}
    </div>
  );
};

// --- Helper Components ---
const LeaveInput = ({ label, name, data, onChange, disabled, isLate, isAbsence }) => {
    let daysKey = 'days';
    let hoursKey = 'hours';
    if(isLate) { daysKey = 'times'; hoursKey = 'mins'; }

    return (
    <div>
        <label className={`text-xs font-bold mb-1 ${isLate || isAbsence ? 'text-red-500' : 'text-neutral-medium'}`}>{label}</label>
        <div className="flex gap-2">
            <input type="number" placeholder={isLate ? "ครั้ง" : "วัน"} value={data?.[daysKey]} onChange={(e)=>onChange(name, daysKey, e.target.value)} disabled={disabled} className={`w-full border rounded-lg p-2 text-center ${isLate || isAbsence ? 'bg-red-50 border-red-200 text-red-700' : ''}`}/>
            <input type="number" placeholder={isLate ? "นาที" : "ชม."} value={data?.[hoursKey]} onChange={(e)=>onChange(name, hoursKey, e.target.value)} disabled={disabled} className={`w-full border rounded-lg p-2 text-center ${isLate || isAbsence ? 'bg-red-50 border-red-200 text-red-700' : ''}`}/>
        </div>
    </div>
    )
};

const SummaryOption = ({ label, checked, onClick, disabled, children }) => (
    <div onClick={!disabled ? onClick : null} className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${checked ? 'bg-secondary-cream border-primary-gold' : 'bg-white border-gray-100'} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
        <div className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${checked ? 'bg-primary-navy border-primary-navy text-white' : 'border-gray-300'}`}>
                {checked && <CheckCircle size={12}/>}
            </div>
            <span className="font-bold text-primary-navy">{label}</span>
        </div>
        {children}
    </div>
);

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
        const colIndex = mapping[field.key];ฃ

        // รับค่ามาเก็บในตัวแปร value ก่อน
        let value = row[colIndex] || ""; 

        // ✅ เพิ่ม Logic: ถ้าเป็นช่องวันที่ และมีเครื่องหมาย / ให้แปลงเป็น -
        if ((field.key === 'startDate' || field.key === 'dueProbation') && value && typeof value === 'string') {
            // วิธีที่ 1: แปลงจาก DD/MM/YYYY -> DD-MM-YYYY (ตามที่คุณขอ)
            value = value.replace(/\//g, '-');
            
            // 💡 ข้อแนะนำเพิ่มเติม:
            // ถ้าคุณต้องการให้ช่อง <input type="date"> ในหน้าฟอร์มแสดงค่าขึ้นมาอัตโนมัติ 
            // ค่าที่ส่งไปต้องเป็น Format "YYYY-MM-DD" (ปี-เดือน-วัน) 
            // ถ้าใช้ DD-MM-YYYY บาง Browser อาจจะไม่ขึ้น ให้ใช้วิธีด้านล่างแทนครับ:
            /*
            const parts = value.split(/[-/]/); // ตัดด้วย - หรือ /
            if (parts.length === 3) {
                // สมมติว่ามาเป็น วัน/เดือน/ปี -> แปลงเป็น ปี-เดือน-วัน
                value = `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
            */
        }

        mappedRow[field.key] = value;
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
  const senderName = settings?.sender_name || 'HR Evaluation System';
  
  const emailSystem = settings?.email_system || 'carpetmaker05@gmail.com';
  const emailHR = settings?.email_hr || 'carpetmaker05@gmail.com';
  const emailApprover = settings?.email_approver || 'carpetmaker05@gmail.com';

  const refTime = new Date().toLocaleTimeString('th-TH').replace(/:/g, ''); 
  const refId = `${evalId}-${refTime}`; 

  if (nextStatus === 'pending_hr') {
      toEmail = emailHR; 
      // ✅ เพิ่ม Ref ID ท้ายหัวข้อ
      subject = `[Action Required] กรุณาลงนามผลประเมินของ ${employeeName} (Ref: ${refId})`; 
      messageHtml = `<h3>เรียน ${hrTitle},</h3><p>กรุณาตรวจสอบและลงนามผลการทดลองงานของ <b>${employeeName}</b></p>`;
      signRole = 'hr';
  } 
  else if (nextStatus === 'pending_approval') {
      toEmail = emailApprover; 
      // ✅ เพิ่ม Ref ID ท้ายหัวข้อ
      subject = `[Action Required] กรุณาอนุมัติผลประเมินของ ${employeeName} (Ref: ${refId})`;
      messageHtml = `<h3>เรียน ${approverTitle},</h3><p>ฝ่ายบุคคลตรวจสอบเรียบร้อยแล้ว โปรดพิจารณาอนุมัติ</p>`;
      signRole = 'approver';
  } 
  else if (nextStatus === 'completed') {
      toEmail = emailSystem; 
      // ✅ เพิ่ม Ref ID ท้ายหัวข้อ
      subject = `[Completed] ผลประเมิน ${employeeName} เสร็จสมบูรณ์ (Ref: ${refId})`;
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
            html: messageHtml,
            senderName: senderName
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
                background: #fff; 
                color: #000; 
                line-height: 1.3; 
            }

            /* --- Page Setup (A4 Scaled) --- */
            @page { 
                size: A4; 
                margin: 0; /* ตัดขอบ Default ออกเพื่อให้เราคุมเอง */
            }
            
            .page-container {
                width: 210mm;
                height: 297mm;
                padding: 2mm 3mm; /* ระยะขอบกระดาษจริง (บนล่าง 15mm, ซ้ายขวา 10mm) */
                margin: 0 auto;
                background: white;
                
                /* 🔥 หัวใจสำคัญ: ย่อส่วนลง 95% เพื่อให้เหมือน PDF */
                transform: scale(0.95); 
                transform-origin: top center; /* ย่อโดยยึดจุดกึ่งกลางด้านบน */
            }

            /* --- Shared Classes --- */
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            .justify-end { justify-content: flex-end; }
            .w-full { width: 100%; }
            .border-b { border-bottom: 1px dotted #000; }

            /* --- Section Box Style --- */
            .section-box {
                border: 1px solid #000;
                padding: 8px 10px; /* ลด padding ลงนิดหน่อยให้กระชับ */
                margin-bottom: -1px; 
            }
            .no-border-top { border-top: none !important; }

            /* --- Header --- */
            .header-content { display: flex; align-items: center; }
            .company-info { width: 45%; font-size: 10px; padding-right: 10px; border-right: 1px solid #000; line-height: 1.2; }
            .form-title { width: 55%; text-align: center; }
            .form-title h1 { font-size: 16px; margin: 0; font-weight: bold; }
            .form-title p { font-size: 12px; margin: 0; }

            /* --- Info Rows --- */
            .info-row { display: flex; margin-bottom: 8px; gap: 8px; align-items: flex-end; font-size: 11px; }
            .field-label { white-space: nowrap; font-weight: bold; }
            .field-value { border-bottom: 1px dotted #000; flex-grow: 1; text-align: center; color: #0033cc; padding-bottom: 0; height: 16px; }

            /* --- Attendance --- */
            .attendance-head { border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 4px; display: flex; justify-content: space-between; font-size: 11px; }
            .attendance-grid { display: grid; margin-bottom: 8px; grid-template-columns: repeat(3, 1fr); gap: 5px; }
            .att-item { display: flex; align-items: center; font-size: 10px; }
            .att-input { border-bottom: 1px dotted #000; width: 25px; text-align: center; margin: 0 2px; color: blue; }

            /* --- Table --- */
            table.head-eval-table { width: 100%; table-layout: fixed; border-collapse: collapse; margin: 0; margin-bottom: -1px; border: 1px solid #000; border-top: none; }
            table.head-eval-table th, table.head-eval-table td { border: 1px solid #000; padding: 3px; vertical-align: middle; }
            table.head-eval-table th { background-color: #f0f0f0; font-weight: bold; text-align: center; height: 35px; font-size: 11px; }
            
            .diagonal-cell { position: relative; width: 60px; padding: 0 !important; background: linear-gradient(to top right, transparent 48%, #000 49%, #000 51%, transparent 52%); }
            .diag-top { position: absolute; top: 1px; right: 2px; font-size: 9px; text-align: right; line-height: 1; }
            .diag-bottom { position: absolute; bottom: 1px; left: 2px; font-size: 9px; text-align: left; line-height: 1; }
            
            .rating-circle { display: inline-block; width: 18px; height: 18px; border-radius: 50%; text-align: center; line-height: 16px; margin: 0 auto; font-size: 10px; }
            .selected { border: 2px solid #000; font-weight: bold; background: #ddd; }

            /* --- Summary --- */
            .summary-container { display: flex; border: 1px solid #000; border-top: none; margin-bottom: -1px; }
            .opinion-part { width: 65%; padding: 8px; border-right: 1px solid #000; font-size: 11px; }
            .score-part { width: 35%; padding: 8px; display: flex; flex-direction: column; justify-content: center; gap: 8px; }
            
            .checkbox-item { display: flex; align-items: flex-end; margin-bottom: 3px; }
            .checkbox-box { width: 12px; height: 12px; border: 1px solid #000; display: inline-block; margin-right: 5px; position: relative; }
            .checkbox-box.checked::after { content: '✓'; position: absolute; top: -4px; left: 0px; font-size: 14px; font-weight: bold; }
            
            .score-row { display: flex; justify-content: space-between; border: 1px solid #000; padding: 4px; font-size: 11px; }
            .score-val { font-weight: bold; font-size: 13px; }
            
            .sig-row { display: flex; justify-content: flex-end; margin-top: 15px; align-items: flex-end; }
            .sig-line { border-bottom: 1px dotted #000; width: 160px; text-align: center; position: relative; height: 25px; }
            .sig-img { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); max-height: 35px; max-width: 140px; }
            .sig-label { margin-right: 5px; font-weight: bold; }

            /* --- Footer --- */
            .footer { margin-top: 5px; font-size: 8px; text-align: right; color: #555; font-style: italic; }

        </style>
    </head>
    <body>
        <div class="page-container">
            
            <div class="section-box">
                <div class="header-content">
                    <div class="company-info" style="width:35%">
                        <div><strong>บริษัท คาร์เปท เมกเกอร์ (ประเทศไทย) จำกัด และ</strong></div>
                        <div><strong>บริษัท คาร์เปท เมกเกอร์ พี2ดับบลิว (ประเทศไทย) จำกัด</strong></div>
                        <div style="margin-top:2px;">The Carpet Maker (Thailand) Ltd. And</div>
                        <div>The Carpet Maker P2W (Thailand) Ltd.</div>
                    </div>
                    <div class="form-title" style="width:45%; text-align:center;">
                        <h1>แบบประเมินผลการทดลองงานของพนักงาน</h1>
                        <p>Probation Evaluation Form</p>
                    </div>
                </div>
            </div>

            <div class="section-box no-border-top">
                <div style="font-weight: bold; margin-bottom: 5px; border-bottom: 1px solid #000; display:inline-block; font-size: 11px;">ข้อมูลพนักงาน (Employee information)</div>
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
                    <span class="field-value" style="width: 20px; flex:none;">${startD.d}</span>
                    <span class="field-label">เดือน:</span> <span class="field-value" style="width: 70px; flex:none;">${startD.m}</span>
                    <span class="field-label">พ.ศ.:</span> <span class="field-value" style="width: 30px; flex:none;">${startD.y}</span>
                    <span style="flex-grow:1;"></span> <span class="field-label">ครบกำหนด (Due):</span> 
                    <span class="field-value" style="width: 20px; flex:none;">${dueD.d}</span>
                    <span class="field-label">เดือน:</span> <span class="field-value" style="width: 70px; flex:none;">${dueD.m}</span>
                    <span class="field-label">พ.ศ.:</span> <span class="field-value" style="width: 30px; flex:none;">${dueD.y}</span>
                </div>
            </div>

            <div class="section-box no-border-top">
                <div class="attendance-head">
                    <strong>ข้อมูลสถิติการทำงาน (Time Attendance)</strong>
                    <div style="font-size:10px;">
                        จากวันที่: <span style="border-bottom:1px dotted #000; padding:0 5px; display: inline-block; min-width: 80px; text-align: center;">${data.attendFrom || '-'}</span>
                        ถึงวันที่: <span style="border-bottom:1px dotted #000; padding:0 5px; display: inline-block; min-width: 80px; text-align: center;">${data.attendTo || '-'}</span>
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

            <div class="section-box no-border-top" style="text-align:left; font-weight:bold; font-size:10px; padding: 4px;">
                เขียนวงกลมล้อมรอบคะแนนที่ประเมินให้ (Write a circle around the rating that is evaluated)
            </div>

            <table class="head-eval-table">
                <thead>
                    <tr>
                        <th rowspan="2" style="width:52%; text-align:center;">หัวข้อในการประเมิน<br><span style="font-weight:normal; font-style:italic;">(Evaluate Topic)</span></th>
                        <th rowspan="2" class="diagonal-cell" style="font-size: 4px; width: 6%">
                            <div class="diag-top" style="font-size: 7px;">คะแนน<br>Score</div>
                            <div class="diag-bottom" style="font-size: 7px;">น้ำหนัก<br>Weight</div>
                        </th>
                        <th style="font-size: 8px; width: 6%">ใช้ไม่ได้<br>(Bad)<br>1</th>
                        <th style="font-size: 8px; width: 6%">ต้องปรับปรุง<br>(Poor)<br>2</th>
                        <th style="font-size: 8px; width: 6%">พอใช้<br>(Fair)<br>3</th>
                        <th style="font-size: 8px; width: 6%">ดี<br>(Good)<br>4</th>
                        <th style="font-size: 8px; width: 6%">ดีมาก<br>(Very Good)<br>5</th>
                        <th style="font-size: 7px; width: 6%">ดีเยี่ยม<br>(Excellent)<br>6</th>
                        <th style="font-size: 8px; width: 6%">ดีเลิศ<br>(Perfect)<br>7</th>
                        <th rowspan="2" style="width:8%;">คะแนน<br>(Score)</th>
                    </tr>
                </thead>
                <tbody>
                    ${[
                        {id:1, w:15, t:'ปริมาณงานที่ทำสำเร็จจากที่ได้มอบหมาย', e:'(The amount of work accomplished from the assignment)'},
                        {id:2, w:15, t:'คุณภาพของงานที่ทำสำเร็จ', e:'(The quality of the complete work)'},
                        {id:3, w:15, t:'การปฏิบัติตามคำสั่งของผู้บังคับบัญชาหรือตาม WI หรือ WP', e:'(Compliance with orders of supervisors or according to WI or WP)'},
                        {id:4, w:10, t:'ความสามารถการเรียนรู้งานและความเข้าใจในงานที่ทำ', e:'(Ability to learn and understand the work)'},
                        {id:5, w:10, t:'ความไว้วางใจและความรับผิดชอบในงานที่ได้รับมอบหมาย', e:'(Trust and responsibility in assigned work)'},
                        {id:6, w:10, t:'ความร่วมมือในการทำงานเป็นทีม', e:'(Cooperation in Teamwork)'},
                        {id:7, w:10, t:'การตรงต่อเวลาและความสม่ำเสมอในการมาทำงาน', e:'(Punctuality in working, quitting work and Consistency in working)'},
                        {id:8, w:5,  t:'การเอาใจใส่ในการปฏิบัติตามกฎเรื่องความปลอดภัยและชีวอนามัยของบริษัทฯ', e:'(Caring for compliance the safety and health regulations of the company)'},
                        {id:9, w:5,  t:'ความชื่อสัตย์ และทัศนคติที่ดีต่อบริษัท', e:'(Honesty and good attitude towards the company)'},
                        {id:10, w:5, t:'การปฏิบัติตามกฎระเบียบและการรักษาทรัพย์สินของบริษัท', e:'(Compliance with rules and regulations for maintaining company assets)'}
                    ].map(topic => {
                        const score = data.ratings[topic.id];
                        const calcScore = score ? (topic.w * score).toFixed(2) : '';
                        let tds = '';
                        for(let i=1; i<=7; i++) {
                            tds += `<td class="text-center"><div class="rating-circle ${score == i ? 'selected' : ''}">${i}</div></td>`;
                        }
                        return `
                            <tr>
                                <td style="text-align: left;">
                                    <div style="font-size:11px; color:#000000;">${topic.id}. ${topic.t}</div>
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
                    <tr style="background:#f9f9f9; font-size: 11px;">
                        <td class="text-right font-bold" style="text-align: center">คะแนนเต็ม (Full marks)</td>
                        <td class="text-center font-bold">100</td>
                        <td colspan="7"></td>
                        <td class="text-center font-bold" style="font-size:13px;">${totalScore ? totalScore.toFixed(2) : ''}</td>
                    </tr>
                </tfoot>
            </table>

            <div class="summary-container">
                <div class="opinion-part">
                    <strong>ความเห็น (Opinion) :</strong>
                    <div class="checkbox-item" style="margin-top:10px;">
                        <div class="checkbox-box ${data.passProbation ? 'checked' : ''}"></div> ผ่านการทดลองงาน (Pass probation)
                    </div>
                    <div class="checkbox-item" style="margin-top:10px;">
                        <div class="checkbox-box ${data.notPassProbation ? 'checked' : ''}"></div> ไม่ผ่านการทดลองงาน (ระบุเหตุผล) : 
                        <span class="border-b" style="width:180px; display:inline-block; color:blue;">${data.notPassReason || ''}</span>
                    </div>
                    <div class="checkbox-item" style="margin-top:10px;">
                        <div class="checkbox-box ${data.otherOpinion ? 'checked' : ''}"></div> อื่นๆ (Other) : 
                        <span class="border-b" style="width:220px; display:inline-block; color:blue;">${data.otherOpinionText || ''}</span>
                    </div>
                    <div class="sig-row" style="justify-content: flex-start; margin-top:20px;">
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

            <div class="section-box no-border-top">
                <div style="margin-bottom:10px; font-size:11px; display:flex; flex-direction:column;">
                  <div style="display:flex; align-items:flex-end; gap:5px;">
                        แผนกบริหารทรัพยากรมนุษย์ 
                  </div>
                  <div style="display:flex; align-items:flex-end; gap:5px;">
                        (Human Resource Management Department)
                  </div>
                  <div style="display:flex; align-items:flex-end; gap:5px;">
                      <span class="sig-label">ความเห็น (Opinion) : </span>
                      <span class="border-b" style="flex:1; color:blue; display:inline-block;">
                          ${data.hrOpinion || ''}
                      </span>
                  </div>
              </div>
                <div class="flex justify-end" style="margin-top: 20px; padding-right: 15px; text-align: right; font-size:11px;">
                     <div class="text-center" style="text-align: center;">
                        <div class="sig-line" style="margin:0 auto;">
                            <span>${data.hrSign ? `<img src="${data.hrSign}" class="sig-img">` : ''}</span>
                        </div>
                        <div style="margin-top:5px; font-size:11px;">( ${hrTitle} )</div>
                    </div>
                </div>
            </div>

            <div class="section-box no-border-top">
                <div style="margin-bottom:10px; font-size:11px; display:flex; flex-direction:column;">
                  <div style="display:flex; align-items:flex-end; gap:5px;">
                      ประธานเจ้าหน้าที่บริหาร</div>
                  <div style="display:flex; align-items:flex-end; gap:5px;">
                      (Chief Executive Officer)</div>
                  <div style="display:flex; align-items:flex-end; gap:5px;">
                      <span class="sig-label">ความเห็น (Opinion) : </span>
                      <span class="border-b" style="flex:1; color:blue; display:inline-block;">
                          ${data.approverOpinion || ''}
                      </span>
                  </div>
                </div>
                <div class="flex justify-end" style="margin-top: 20px; padding-right: 15px; text-align: right; font-size:11px;">
                     <div class="text-center" style="text-align: center;">
                        <div class="sig-line" style="margin:0 auto;">
                        <span>${data.approverSign ? `<img src="${data.approverSign}" class="sig-img">` : ''}</span>
                    </div>
                    <div style="margin-top:5px; font-size:11px;">( ${approverTitle} )</div>
                </div>
            </div>
        </div>
            <div class="footer">
                Form.FR-RC-007 แก้ไขครั้งที่ 02 เริ่มใช้วันที่ 17 กุมภาพันธ์ 2563 (Printed: ${printDateStr})
            </div>
        <script>
            window.onload = function() { setTimeout(function(){ window.print(); }, 500); }
        </script>
    </body>
    </html>
`;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
};