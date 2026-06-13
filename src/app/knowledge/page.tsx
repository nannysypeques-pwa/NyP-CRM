"use client";

import React, { useState, useEffect } from "react";
import { 
  BookOpen, 
  Search, 
  Plus, 
  FileText, 
  Sparkles,
  Edit,
  Trash2,
  Loader2,
  X
} from "lucide-react";

interface Doc {
  id: string;
  titulo: string;
  categoria: string;
  contenido: string;
  estado: string;
  creadoEn: string;
}

export default function KnowledgePage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Doc | null>(null);
  const [formTitulo, setFormTitulo] = useState("");
  const [formCategoria, setFormCategoria] = useState("Servicios");
  const [formContenido, setFormContenido] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchDocs();
  }, []);

  const fetchDocs = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/knowledge");
      if (!res.ok) {
        throw new Error("Error al obtener los documentos");
      }
      const data = await res.json();
      setDocs(data);
    } catch (err: any) {
      console.error(err);
      setError("No se pudo cargar la base de conocimientos. Por favor intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setSelectedDoc(null);
    setFormTitulo("");
    setFormCategoria("Servicios");
    setFormContenido("");
    setIsModalOpen(true);
  };

  const openEditModal = (doc: Doc) => {
    setSelectedDoc(doc);
    setFormTitulo(doc.titulo);
    setFormCategoria(doc.categoria);
    setFormContenido(doc.contenido);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitulo.trim() || !formContenido.trim()) return;

    try {
      setSubmitting(true);
      const body = {
        titulo: formTitulo,
        categoria: formCategoria,
        contenido: formContenido
      };

      let res;
      if (selectedDoc) {
        // Edit Mode
        res = await fetch(`/api/knowledge/${selectedDoc.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
      } else {
        // Create Mode
        res = await fetch("/api/knowledge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
      }

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Error al guardar el documento");
      }

      setIsModalOpen(false);
      fetchDocs();
    } catch (err: any) {
      alert(err.message || "Error al realizar la operación");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este documento de conocimiento? La IA dejará de usar esta información de inmediato.")) {
      return;
    }

    try {
      const res = await fetch(`/api/knowledge/${id}`, {
        method: "DELETE"
      });

      if (!res.ok) {
        throw new Error("Error al eliminar el documento");
      }

      fetchDocs();
    } catch (err: any) {
      alert(err.message || "No se pudo eliminar el documento");
    }
  };

  const filteredDocs = docs.filter(doc => 
    doc.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.categoria.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.contenido.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 space-y-6 h-full overflow-y-auto custom-scrollbar">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#026692]">Base de Conocimientos (AI)</h1>
          <p className="text-slate-500 text-sm mt-1">Sube y gestiona documentos para entrenar al Asistente de IA comercial sobre tu negocio.</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="flex items-center space-x-2 bg-[#026692] text-white hover:bg-[#1d4359] px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Añadir Documento</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
          <Search className="w-5 h-5" />
        </span>
        <input
          type="text"
          placeholder="Buscar documentos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#e2edf6] rounded-2xl text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-[#026692] focus:border-transparent transition-all shadow-sm"
        />
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left column: documents list */}
        <div className="lg:col-span-2 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <Loader2 className="w-10 h-10 text-[#026692] animate-spin" />
              <span className="text-slate-400 text-sm font-medium">Cargando base de conocimientos...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 text-red-600 p-6 rounded-3xl border border-red-100 text-center font-medium">
              {error}
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-[#e2edf6] shadow-sm text-center space-y-3">
              <FileText className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="font-extrabold text-slate-700">No hay documentos</h3>
              <p className="text-slate-400 text-xs max-w-sm mx-auto">
                No se encontraron documentos en la base de conocimientos. Haz clic en "Añadir Documento" para agregar tarifas o políticas del negocio.
              </p>
            </div>
          ) : (
            filteredDocs.map((doc) => (
              <div key={doc.id} className="bg-white p-6 rounded-3xl border border-[#e2edf6] shadow-sm space-y-3 hover:shadow-md transition-all relative group">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-sky-50 text-[#026692]">
                      {doc.categoria}
                    </span>
                    <h3 className="font-extrabold text-slate-800 text-base">{doc.titulo}</h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => openEditModal(doc)}
                      className="p-1.5 text-slate-400 hover:text-[#026692] hover:bg-sky-50 rounded-lg transition-all"
                      title="Editar documento"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(doc.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      title="Eliminar documento"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full font-bold">
                      {doc.estado}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-medium bg-[#f8fbfe] p-4 rounded-2xl border border-[#f0f7fc] whitespace-pre-wrap">
                  {doc.contenido}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Right column: training summary */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-[#026692] to-[#388dbb] text-white p-6 rounded-3xl shadow-md space-y-4">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-sky-200">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-sm uppercase tracking-wide text-sky-100">Entrenamiento Contextual</h3>
              <p className="text-xs leading-relaxed text-sky-50">
                El bot de WhatsApp utiliza estos documentos de forma automatizada para responder dudas específicas del cliente sin inventar información, garantizando una atención segura y alineada a las políticas reales de Nannys y Peques.
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-[#e2edf6] shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-800 text-sm">Resumen de Indexación</h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-2 border-b border-[#f0f7fc]">
                <span className="text-slate-500 font-semibold">Documentos Cargados:</span>
                <span className="font-bold text-slate-700">{docs.length}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#f0f7fc]">
                <span className="text-slate-500 font-semibold">Caché del Servidor:</span>
                <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">ACTIVA (5 min)</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#f0f7fc]">
                <span className="text-slate-500 font-semibold">Estado de la IA:</span>
                <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">gpt-4o-mini (Activo)</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl border border-[#e2edf6] shadow-2xl p-6 space-y-6 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex justify-between items-center pb-3 border-b border-[#f0f7fc]">
              <h2 className="text-lg font-extrabold text-slate-800">
                {selectedDoc ? "Editar Documento de Conocimiento" : "Añadir Documento de Conocimiento"}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Título del Documento</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Tarifas de Niñeras 2026, Políticas de Cancelación, etc."
                  value={formTitulo}
                  onChange={(e) => setFormTitulo(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#f8fbfe] border border-[#e2edf6] rounded-xl text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-[#026692] focus:border-transparent transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Categoría</label>
                <select
                  value={formCategoria}
                  onChange={(e) => setFormCategoria(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#f8fbfe] border border-[#e2edf6] rounded-xl text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-[#026692] focus:border-transparent transition-all"
                >
                  <option value="Servicios">Servicios</option>
                  <option value="Precios">Precios y Tarifas</option>
                  <option value="Políticas">Políticas y Condiciones</option>
                  <option value="Emergencias">Emergencias</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Contenido / Información</label>
                <textarea
                  required
                  rows={6}
                  placeholder="Escribe aquí toda la información detallada que la IA debe leer. Sé claro, conciso y preciso."
                  value={formContenido}
                  onChange={(e) => setFormContenido(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#f8fbfe] border border-[#e2edf6] rounded-xl text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-[#026692] focus:border-transparent transition-all resize-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-[#f0f7fc]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center space-x-2 bg-[#026692] text-white hover:bg-[#1d4359] px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{selectedDoc ? "Guardar Cambios" : "Crear Documento"}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
