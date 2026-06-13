"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, 
  UserPlus, 
  Search, 
  Mail, 
  Shield, 
  MapPin, 
  Activity, 
  Trash2, 
  Edit3, 
  Key, 
  X, 
  Check, 
  Loader2,
  Building,
  UserCheck,
  AlertTriangle
} from "lucide-react";

interface User {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  estado: string;
  ciudad: string | null;
  urlAvatar: string | null;
  creadoEn: string;
}

export default function UsersAdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRol, setFilterRol] = useState("TODOS");

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [passModalOpen, setPassModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRol, setFormRol] = useState("VENDEDOR");
  const [formCiudad, setFormCiudad] = useState("CDMX");
  const [formAvatar, setFormAvatar] = useState("");
  const [formEstado, setFormEstado] = useState("ACTIVE");
  const [submitLoading, setSubmitLoading] = useState(false);

  // Load users list
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else {
        const err = await res.json();
        setErrorMsg((err.error || "No tienes permisos para ver esta sección.") + " Redirigiendo al Dashboard...");
        setTimeout(() => {
          window.location.href = "/";
        }, 3000);
      }
    } catch (error) {
      console.error(error);
      setErrorMsg("Error de conexión al cargar usuarios.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Form cleanup
  const resetForm = () => {
    setFormName("");
    setFormEmail("");
    setFormPassword("");
    setFormRol("VENDEDOR");
    setFormCiudad("CDMX");
    setFormAvatar("");
    setFormEstado("ACTIVE");
    setErrorMsg(null);
  };

  // Open Edit modal
  const openEdit = (user: User) => {
    setSelectedUser(user);
    setFormName(user.nombre);
    setFormEmail(user.email);
    setFormRol(user.rol);
    setFormCiudad(user.ciudad || "CDMX");
    setFormAvatar(user.urlAvatar || "");
    setFormEstado(user.estado);
    setEditModalOpen(true);
  };

  // Open Pass modal
  const openPass = (user: User) => {
    setSelectedUser(user);
    setFormPassword("");
    setPassModalOpen(true);
  };

  // Handle Create Submit
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formEmail || !formPassword || !formRol) {
      setErrorMsg("Completa los campos obligatorios.");
      return;
    }

    try {
      setSubmitLoading(true);
      setErrorMsg(null);
      
      const payload = {
        nombre: formName,
        email: formEmail,
        password: formPassword,
        rol: formRol,
        ciudad: formRol === "GERENTE" ? null : formCiudad,
        urlAvatar: formAvatar || null
      };

      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(`Usuario "${data.nombre}" creado exitosamente.`);
        setCreateModalOpen(false);
        resetForm();
        fetchUsers();
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        setErrorMsg(data.error || "Error al crear el usuario.");
      }
    } catch (error) {
      setErrorMsg("Ocurrió un error en la comunicación.");
    } finally {
      setSubmitLoading(false);
    }
  };

  // Handle Edit Submit
  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (!formName || !formEmail || !formRol) {
      setErrorMsg("Nombre, Email y Rol son requeridos.");
      return;
    }

    try {
      setSubmitLoading(true);
      setErrorMsg(null);

      const payload = {
        nombre: formName,
        email: formEmail,
        rol: formRol,
        ciudad: formRol === "GERENTE" ? null : formCiudad,
        estado: formEstado,
        urlAvatar: formAvatar || null
      };

      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(`Usuario "${data.nombre}" actualizado con éxito.`);
        setEditModalOpen(false);
        setSelectedUser(null);
        resetForm();
        fetchUsers();
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        setErrorMsg(data.error || "Error al actualizar el usuario.");
      }
    } catch (error) {
      setErrorMsg("Ocurrió un error en la comunicación.");
    } finally {
      setSubmitLoading(false);
    }
  };

  // Handle Password Reset
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !formPassword.trim()) {
      setErrorMsg("Escribe una contraseña válida.");
      return;
    }

    try {
      setSubmitLoading(true);
      setErrorMsg(null);

      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: formPassword })
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(`Contraseña de "${data.nombre}" restablecida con éxito.`);
        setPassModalOpen(false);
        setSelectedUser(null);
        setFormPassword("");
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        setErrorMsg(data.error || "Error al restablecer la contraseña.");
      }
    } catch (error) {
      setErrorMsg("Ocurrió un error en la comunicación.");
    } finally {
      setSubmitLoading(false);
    }
  };

  // Handle Delete User
  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar permanentemente al usuario "${userName}" de la base de datos?`)) {
      return;
    }

    try {
      setErrorMsg(null);
      const res = await fetch(`/api/users/${userId}`, {
        method: "DELETE"
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(`Usuario "${userName}" eliminado con éxito.`);
        fetchUsers();
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        setErrorMsg(data.error || "No se pudo eliminar al usuario.");
      }
    } catch (error) {
      setErrorMsg("Error de conexión al eliminar usuario.");
    }
  };

  // Filter logic
  const filteredUsers = users.filter(user => {
    const matchSearch = 
      user.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.ciudad && user.ciudad.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchRol = filterRol === "TODOS" || user.rol === filterRol;
    
    return matchSearch && matchRol;
  });

  // Role stats counters
  const totalCount = users.length;
  const activeCount = users.filter(u => u.estado === "ACTIVE").length;
  const coordinateCount = users.filter(u => u.rol === "COORDINADOR").length;
  const sellerCount = users.filter(u => u.rol === "VENDEDOR").length;

  return (
    <div className="p-8 h-full overflow-y-auto custom-scrollbar bg-[#f3f8fc] space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#026692] flex items-center gap-2">
            <Users className="w-8 h-8" /> Gestión de Usuarios
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Agrega nuevos agentes, edita sus roles, restablece accesos y asigna coberturas territoriales para el equipo.
          </p>
        </div>
        <button 
          onClick={() => { resetForm(); setCreateModalOpen(true); }}
          className="bg-[#026692] hover:bg-[#1d4359] text-white px-5 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all flex-shrink-0"
        >
          <UserPlus className="w-4 h-4" /> Agregar Colaborador
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl flex items-center gap-2 shadow-sm text-sm animate-fadeIn">
          <Check className="w-4 h-4 flex-shrink-0" /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl flex items-start gap-2 shadow-sm text-sm animate-fadeIn">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Acción Denegada</p>
            <p className="mt-0.5">{errorMsg}</p>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-700 font-bold ml-2">×</button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#e2edf6] shadow-sm flex items-center space-x-4">
          <div className="p-3.5 bg-[#f0f7fc] text-[#026692] rounded-xl"><Users className="w-5 h-5" /></div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Total Colaboradores</span>
            <p className="text-2xl font-black text-slate-800 leading-none mt-1">{totalCount}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#e2edf6] shadow-sm flex items-center space-x-4">
          <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-xl"><Activity className="w-5 h-5" /></div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Usuarios Activos</span>
            <p className="text-2xl font-black text-slate-800 leading-none mt-1">{activeCount}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#e2edf6] shadow-sm flex items-center space-x-4">
          <div className="p-3.5 bg-purple-50 text-purple-600 rounded-xl"><UserCheck className="w-5 h-5" /></div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Coordinadores</span>
            <p className="text-2xl font-black text-slate-800 leading-none mt-1">{coordinateCount}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#e2edf6] shadow-sm flex items-center space-x-4">
          <div className="p-3.5 bg-sky-50 text-[#026692] rounded-xl"><Building className="w-5 h-5" /></div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Asesores Ventas</span>
            <p className="text-2xl font-black text-slate-800 leading-none mt-1">{sellerCount}</p>
          </div>
        </div>
      </div>

      {/* Filters & Actions bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#e2edf6] shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input 
            type="text" 
            placeholder="Buscar por nombre, email o ciudad..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#f4f8fc] border-0 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#026692] transition-all"
          />
        </div>

        {/* Filters Select */}
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <span className="text-xs font-bold text-slate-400 flex-shrink-0">Filtrar Rol:</span>
          <select 
            value={filterRol}
            onChange={(e) => setFilterRol(e.target.value)}
            className="bg-[#f4f8fc] border-0 text-slate-700 text-xs font-bold rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#026692] transition-all cursor-pointer w-full md:w-44"
          >
            <option value="TODOS">Todos los roles</option>
            <option value="GERENTE">Gerente</option>
            <option value="COORDINADOR">Coordinador</option>
            <option value="VENDEDOR">Vendedor</option>
          </select>
        </div>
      </div>

      {/* Main Table area */}
      <div className="bg-white rounded-2xl border border-[#e2edf6] shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <Loader2 className="w-10 h-10 text-[#026692] animate-spin" />
            <p className="text-sm font-semibold text-slate-400">Consultando Supabase...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-16 text-slate-400 italic text-sm">
            No se encontraron colaboradores que coincidan con la búsqueda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#fcfdfd] border-b border-[#e2edf6] text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-4 px-6">Colaborador</th>
                  <th className="py-4 px-6">Rol asignado</th>
                  <th className="py-4 px-6">Cobertura Ciudad</th>
                  <th className="py-4 px-6">Estatus</th>
                  <th className="py-4 px-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f7fc]">
                {filteredUsers.map((user) => {
                  const initialName = user.nombre.split(" ").map(n => n[0]).join("").slice(0,2);
                  return (
                    <tr key={user.id} className="hover:bg-[#fcfdfd] transition-all text-xs font-medium text-slate-700">
                      {/* User card info */}
                      <td className="py-4 px-6 flex items-center space-x-3">
                        {user.urlAvatar ? (
                          <img 
                            src={user.urlAvatar} 
                            alt={user.nombre} 
                            className="w-9 h-9 rounded-full object-cover border border-[#b2d4e7] flex-shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-[#026692]/10 text-[#026692] flex items-center justify-center font-bold text-xs flex-shrink-0 uppercase">
                            {initialName}
                          </div>
                        )}
                        <div>
                          <p className="font-extrabold text-slate-800 text-sm leading-tight">{user.nombre}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{user.email}</p>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-1 rounded-xl text-[9px] font-extrabold uppercase inline-flex items-center gap-1 ${
                          user.rol === "GERENTE" ? "bg-sky-50 text-[#026692]" :
                          user.rol === "COORDINADOR" ? "bg-purple-50 text-purple-600" :
                          "bg-emerald-50 text-emerald-600"
                        }`}>
                          <Shield className="w-3 h-3" /> {user.rol}
                        </span>
                      </td>

                      {/* City */}
                      <td className="py-4 px-6">
                        {user.rol === "GERENTE" ? (
                          <span className="text-slate-400 font-bold text-[10px] uppercase flex items-center gap-1">
                            🌎 Toda la República
                          </span>
                        ) : (
                          <span className="font-bold flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" /> {user.ciudad || "Sin cobertura asignada"}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          user.estado === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                        }`}>
                          {user.estado === "ACTIVE" ? "Activo" : "Inactivo"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right space-x-1">
                        <button 
                          onClick={() => openPass(user)}
                          title="Restablecer Contraseña"
                          className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-xl transition-all inline-block"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => openEdit(user)}
                          title="Editar Colaborador"
                          className="p-2 text-slate-400 hover:text-[#026692] hover:bg-[#f0f7fc] rounded-xl transition-all inline-block"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(user.id, user.nombre)}
                          title="Eliminar permanentemente"
                          className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all inline-block"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE USER MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#e2edf6] shadow-2xl max-w-md w-full overflow-hidden animate-scaleIn">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#f8fbfe] border-b border-[#e2edf6] flex items-center justify-between">
              <h3 className="font-extrabold text-[#026692] text-md flex items-center gap-2">
                <UserPlus className="w-5 h-5" /> Agregar Colaborador
              </h3>
              <button 
                onClick={() => setCreateModalOpen(false)} 
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateUser} className="p-6 space-y-4 text-xs font-semibold">
              
              {/* Name */}
              <div className="space-y-1">
                <label className="text-slate-500">Nombre Completo *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ej: Laura Beltrán"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-[#f4f8fc] border-0 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#026692]"
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-slate-500 flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-slate-400" /> Correo Electrónico *</label>
                <input 
                  type="email" 
                  required
                  placeholder="correo@nannysypeques.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full bg-[#f4f8fc] border-0 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#026692]"
                />
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-slate-500 flex items-center gap-1"><Key className="w-3.5 h-3.5 text-slate-400" /> Contraseña Inicial *</label>
                <input 
                  type="password" 
                  required
                  placeholder="Contraseña del colaborador..."
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="w-full bg-[#f4f8fc] border-0 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#026692]"
                />
              </div>

              {/* Role & City row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-500 flex items-center gap-1"><Shield className="w-3.5 h-3.5 text-slate-400" /> Rol asignado *</label>
                  <select 
                    value={formRol}
                    onChange={(e) => setFormRol(e.target.value)}
                    className="w-full bg-[#f4f8fc] border-0 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#026692] cursor-pointer"
                  >
                    <option value="VENDEDOR">Vendedor</option>
                    <option value="COORDINADOR">Coordinador</option>
                    <option value="GERENTE">Gerente</option>
                  </select>
                </div>

                {formRol !== "GERENTE" && (
                  <div className="space-y-1">
                    <label className="text-slate-500 flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" /> Ciudad Cobertura *</label>
                    <select 
                      value={formCiudad}
                      onChange={(e) => setFormCiudad(e.target.value)}
                      className="w-full bg-[#f4f8fc] border-0 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#026692] cursor-pointer"
                    >
                      <option value="CDMX">CDMX</option>
                      <option value="Puebla">Puebla</option>
                      <option value="Querétaro">Querétaro</option>
                      <option value="Xalapa">Xalapa</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Avatar URL */}
              <div className="space-y-1">
                <label className="text-slate-500">URL Foto de Perfil (Opcional)</label>
                <input 
                  type="url" 
                  placeholder="https://images.unsplash.com/..."
                  value={formAvatar}
                  onChange={(e) => setFormAvatar(e.target.value)}
                  className="w-full bg-[#f4f8fc] border-0 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#026692]"
                />
              </div>

              {/* Buttons */}
              <div className="pt-4 flex items-center justify-end space-x-2 border-t border-[#f0f7fc]">
                <button 
                  type="button" 
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={submitLoading}
                  className="px-5 py-2.5 bg-[#026692] hover:bg-[#1d4359] text-white rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                >
                  {submitLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
                    </>
                  ) : "Crear Usuario"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#e2edf6] shadow-2xl max-w-md w-full overflow-hidden animate-scaleIn">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#f8fbfe] border-b border-[#e2edf6] flex items-center justify-between">
              <h3 className="font-extrabold text-[#026692] text-md flex items-center gap-2">
                <Edit3 className="w-5 h-5" /> Editar Colaborador
              </h3>
              <button 
                onClick={() => setEditModalOpen(false)} 
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleEditUser} className="p-6 space-y-4 text-xs font-semibold">
              
              {/* Name */}
              <div className="space-y-1">
                <label className="text-slate-500">Nombre Completo *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ej: Laura Beltrán"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-[#f4f8fc] border-0 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#026692]"
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-slate-500 flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-slate-400" /> Correo Electrónico *</label>
                <input 
                  type="email" 
                  required
                  placeholder="correo@nannysypeques.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full bg-[#f4f8fc] border-0 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#026692]"
                />
              </div>

              {/* Role & City row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-500 flex items-center gap-1"><Shield className="w-3.5 h-3.5 text-slate-400" /> Rol asignado *</label>
                  <select 
                    value={formRol}
                    onChange={(e) => setFormRol(e.target.value)}
                    className="w-full bg-[#f4f8fc] border-0 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#026692] cursor-pointer"
                  >
                    <option value="VENDEDOR">Vendedor</option>
                    <option value="COORDINADOR">Coordinador</option>
                    <option value="GERENTE">Gerente</option>
                  </select>
                </div>

                {formRol !== "GERENTE" && (
                  <div className="space-y-1">
                    <label className="text-slate-500 flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" /> Ciudad Cobertura *</label>
                    <select 
                      value={formCiudad}
                      onChange={(e) => setFormCiudad(e.target.value)}
                      className="w-full bg-[#f4f8fc] border-0 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#026692] cursor-pointer"
                    >
                      <option value="CDMX">CDMX</option>
                      <option value="Puebla">Puebla</option>
                      <option value="Querétaro">Querétaro</option>
                      <option value="Xalapa">Xalapa</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Status & Avatar row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-500">Estado de la cuenta *</label>
                  <select 
                    value={formEstado}
                    onChange={(e) => setFormEstado(e.target.value)}
                    className="w-full bg-[#f4f8fc] border-0 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#026692] cursor-pointer"
                  >
                    <option value="ACTIVE">Activo</option>
                    <option value="INACTIVE">Inactivo / Bloqueado</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500">URL Foto de Perfil</label>
                  <input 
                    type="url" 
                    placeholder="https://images.unsplash.com/..."
                    value={formAvatar}
                    onChange={(e) => setFormAvatar(e.target.value)}
                    className="w-full bg-[#f4f8fc] border-0 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#026692]"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="pt-4 flex items-center justify-end space-x-2 border-t border-[#f0f7fc]">
                <button 
                  type="button" 
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={submitLoading}
                  className="px-5 py-2.5 bg-[#026692] hover:bg-[#1d4359] text-white rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                >
                  {submitLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
                    </>
                  ) : "Guardar Cambios"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {passModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#e2edf6] shadow-2xl max-w-sm w-full overflow-hidden animate-scaleIn">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#f8fbfe] border-b border-[#e2edf6] flex items-center justify-between">
              <h3 className="font-extrabold text-[#026692] text-md flex items-center gap-2">
                <Key className="w-5 h-5" /> Restablecer Acceso
              </h3>
              <button 
                onClick={() => setPassModalOpen(false)} 
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleResetPassword} className="p-6 space-y-4 text-xs font-semibold">
              <p className="text-slate-500 font-medium leading-relaxed">
                Escribe una nueva contraseña para **{selectedUser.nombre}**. El usuario podrá iniciar sesión con esta clave de forma inmediata.
              </p>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-slate-500">Nueva Contraseña *</label>
                <input 
                  type="password" 
                  required
                  placeholder="Escribe al menos 6 caracteres..."
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="w-full bg-[#f4f8fc] border-0 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#026692]"
                />
              </div>

              {/* Buttons */}
              <div className="pt-4 flex items-center justify-end space-x-2 border-t border-[#f0f7fc]">
                <button 
                  type="button" 
                  onClick={() => setPassModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={submitLoading}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                >
                  {submitLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
                    </>
                  ) : "Actualizar Contraseña"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
