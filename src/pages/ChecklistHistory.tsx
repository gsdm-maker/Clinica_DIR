import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface AuditRecord {
  id: string;
  tipo_checklist: string;
  fecha_auditoria: string;
  usuario_id: string;
  porcentaje_completado: number;
  total_hallazgos: number;
  observaciones_generales: string | null;
  users: { name: string } | null;
}

interface AuditDetail {
  id: string;
  pregunta_id: string;
  respuesta: string;
  plan_accion: string | null;
  evidencia_url: string | null;
}

const STORAGE_QUESTIONS: Record<string, string> = {
  'q1': '¿La temperatura del almacén está entre 15-25°C?',
  'q2': '¿La humedad relativa está controlada (45-65%)?',
  'q3': '¿La iluminación es adecuada y no afecta los productos?',
  'q4': '¿El sistema de ventilación funciona correctamente?',
  'q5': '¿Las áreas de almacenamiento están limpias?',
  'q6': '¿Los productos están organizados correctamente?',
  'q7': '¿Hay separación adecuada entre diferentes tipos de productos?',
  'q8': '¿El acceso al almacén está controlado?'
};

const PROTOCOL_QUESTIONS: Record<string, string> = {
  'q1': '¿Se aplica el sistema FIFO (First In, First Out)?',
  'q2': '¿Todos los productos están correctamente etiquetados?',
  'q3': '¿Se verifica regularmente las fechas de vencimiento?',
  'q4': '¿Se mantiene la cadena de frío para productos que lo requieren?',
  'q5': '¿Los medicamentos están segregados según sus características?',
  'q6': '¿Los medicamentos controlados están en área segura?',
  'q7': '¿Se documenta correctamente cada movimiento?',
  'q8': '¿El personal está capacitado en protocolos de almacenamiento?'
};

export default function ChecklistHistory() {
  const { user } = useAuth();
  const [audits, setAudits] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState<AuditRecord | null>(null);
  const [auditDetails, setAuditDetails] = useState<AuditDetail[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    const fetchAudits = async () => {
      if (!user) {
        setLoading(false);
        setError('Debe iniciar sesión para ver el historial de checklists.');
        return;
      }

      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('auditorias_checklist')
        .select(`
          id,
          tipo_checklist,
          fecha_auditoria,
          usuario_id,
          porcentaje_completado,
          total_hallazgos,
          observaciones_generales,
          users (name)
        `)
        .order('fecha_auditoria', { ascending: false });

      if (error) {
        console.error('Error fetching audits:', error);
        toast.error('Error al cargar el historial de checklists.');
        setError(error.message);
      } else {
        setAudits(data as unknown as AuditRecord[]);
      }
      setLoading(false);
    };

    fetchAudits();
  }, [user]);

  const handleViewDetails = async (audit: AuditRecord) => {
    setSelectedAudit(audit);
    setIsModalOpen(true);
    setLoadingDetails(true);
    setAuditDetails([]);

    try {
      const { data, error } = await supabase
        .from('auditoria_preguntas')
        .select('*')
        .eq('auditoria_id', audit.id);

      if (error) {
        throw error;
      }

      setAuditDetails(data || []);
    } catch (error: any) {
      console.error('Error fetching details:', error);
      toast.error('Error al cargar los detalles del checklist.');
    } finally {
      setLoadingDetails(false);
    }
  };

  const getQuestionText = (type: string, questionId: string) => {
    if (type === 'almacenamiento') return STORAGE_QUESTIONS[questionId] || questionId;
    if (type === 'protocolo') return PROTOCOL_QUESTIONS[questionId] || questionId;
    return questionId;
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6 bg-gray-50 min-h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-3 text-gray-700">Cargando historial de checklists...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-6 bg-gray-50 min-h-full flex items-center justify-center text-red-600">
        <p>Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Historial de Checklists</h1>
        <p className="text-gray-600">Revisa los checklists completados anteriormente.</p>
      </div>

      {audits.length === 0 ? (
        <Card className="bg-white p-6 text-center text-gray-500">
          <p>No hay checklists completados aún.</p>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white shadow-md rounded-lg overflow-hidden">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="text-left p-4 text-sm font-semibold text-gray-600">Tipo de Checklist</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-600">Fecha</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-600">Usuario</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-600">Progreso</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-600">Hallazgos</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {audits.map((audit) => (
                <tr key={audit.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="p-4 text-sm text-gray-800 capitalize">{audit.tipo_checklist}</td>
                  <td className="p-4 text-sm text-gray-800">{format(new Date(audit.fecha_auditoria), 'dd/MM/yyyy HH:mm', { locale: es })}</td>
                  <td className="p-4 text-sm text-gray-800">{audit.users?.name || 'Desconocido'}</td>
                  <td className="p-4 text-sm text-gray-800">
                    <span className={
                      audit.porcentaje_completado === 100 ? 'text-green-600 font-bold' :
                        audit.porcentaje_completado >= 80 ? 'text-blue-600' : 'text-orange-600'
                    }>
                      {audit.porcentaje_completado}%
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-800">
                    {audit.total_hallazgos > 0 ? (
                      <Badge variant="danger">{audit.total_hallazgos}</Badge>
                    ) : (
                      <Badge variant="success">0</Badge>
                    )}
                  </td>
                  <td className="p-4 text-sm text-gray-800">
                    <button
                      onClick={() => handleViewDetails(audit)}
                      className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold py-1 px-3 rounded shadow-sm"
                    >
                      Ver Detalle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* DETALLE MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedAudit ? `Detalle Checklist: ${selectedAudit.tipo_checklist.toUpperCase()}` : 'Detalle'}
        size="lg"
      >
        {loadingDetails ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {selectedAudit && (
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded text-sm mb-4">
                <div>
                  <span className="font-semibold block">Fecha:</span>
                  {format(new Date(selectedAudit.fecha_auditoria), 'dd MMMM yyyy HH:mm', { locale: es })}
                </div>
                <div>
                  <span className="font-semibold block">Auditor:</span>
                  {selectedAudit.users?.name || 'Desconocido'}
                </div>
                <div>
                  <span className="font-semibold block">Resultado:</span>
                  {selectedAudit.total_hallazgos === 0 ? (
                    <span className="text-green-600 font-bold">Aprobado sin hallazgos</span>
                  ) : (
                    <span className="text-amber-600 font-bold">{selectedAudit.total_hallazgos} Hallazgos encontrados</span>
                  )}
                </div>
                <div>
                  <span className="font-semibold block">Cumplimiento:</span>
                  {selectedAudit.porcentaje_completado}%
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                  <tr>
                    <th className="px-3 py-2">Pregunta</th>
                    <th className="px-3 py-2 text-center">Respuesta</th>
                    <th className="px-3 py-2">Plan de Acción / Observación</th>
                  </tr>
                </thead>
                <tbody>
                  {auditDetails.map((detail) => (
                    <tr key={detail.id} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-gray-900">
                        {selectedAudit && getQuestionText(selectedAudit.tipo_checklist, detail.pregunta_id)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {detail.respuesta === 'yes' ? (
                          <Badge variant="success">SÍ</Badge>
                        ) : (
                          <Badge variant="danger">NO</Badge>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {detail.respuesta === 'no' ? (
                          <span className="text-red-700 font-medium">{detail.plan_accion || 'Sin plan de acción registrado'}</span>
                        ) : (
                          <span className="text-gray-400 italic">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Evidencias de Hallazgos */}
            {auditDetails.some(d => d.evidencia_url) && (
              <div className="mt-8 border-t pt-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Evidencia Fotográfica de Hallazgos
                </h3>
                <div className="space-y-6">
                  {auditDetails.filter(d => d.evidencia_url).map((detail, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="mb-3 border-b pb-2 border-gray-200">
                        <p className="font-semibold text-gray-900">
                          Pregunta {index + 1}: {selectedAudit && getQuestionText(selectedAudit.tipo_checklist, detail.pregunta_id)}
                        </p>
                        {detail.plan_accion && (
                          <p className="text-sm text-red-600 mt-1">
                            <span className="font-medium">Plan de Acción:</span> {detail.plan_accion}
                          </p>
                        )}
                      </div>
                      <div className="rounded-lg overflow-hidden border border-gray-300 bg-white flex justify-center p-2">
                        <img
                          src={detail.evidencia_url || ''}
                          alt="Evidencia"
                          className="w-auto h-auto max-h-64 object-contain rounded"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Print Button Section */}
            <div className="flex justify-end mt-4">
              <button
                onClick={async () => {
                  try {
                    const [jspdf, autotable] = await Promise.all([
                      import('jspdf'),
                      import('jspdf-autotable')
                    ]);

                    const jsPDF = jspdf.default;
                    // @ts-ignore
                    const doc = new jsPDF();

                    // Generate Table
                    // @ts-ignore
                    autotable.default(doc, {
                      head: [['Pregunta', 'Respuesta', 'Plan de Acción / Observación']],
                      body: auditDetails.map((detail, index) => {
                        const question = selectedAudit ? getQuestionText(selectedAudit.tipo_checklist, detail.pregunta_id) : detail.pregunta_id;
                        const answer = detail.respuesta === 'yes' ? 'SÍ' : 'NO';
                        const observation = (detail.respuesta === 'no' && detail.plan_accion) ? detail.plan_accion : '-';
                        return [
                          `${index + 1}. ${question}`,
                          answer,
                          observation
                        ];
                      }),
                      startY: 55,
                      styles: { fontSize: 10, cellPadding: 3 },
                      headStyles: { fillColor: [66, 66, 66], textColor: 255, fontStyle: 'bold' },
                      columnStyles: {
                        0: { cellWidth: 90 }, // Pregunta
                        1: { cellWidth: 30, halign: 'center', fontStyle: 'bold' }, // Respuesta
                        2: { cellWidth: 'auto' }  // Plan accion
                      },
                      didParseCell: function (data: any) {
                        if (data.section === 'body' && data.column.index === 1) {
                          if (data.cell.raw === 'SÍ') {
                            data.cell.styles.textColor = [0, 150, 0];
                          } else {
                            data.cell.styles.textColor = [200, 0, 0];
                          }
                        }
                      }
                    });

                    // Add header info (same as before)
                    doc.setFontSize(18);
                    doc.text(`Reporte de Checklist: ${selectedAudit?.tipo_checklist.toUpperCase()}`, 14, 20);

                    doc.setFontSize(11);
                    doc.setTextColor(100);
                    doc.text(`Generado el: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 28);
                    doc.setTextColor(0);

                    doc.setFontSize(12);
                    doc.text(`Fecha Auditoría: ${selectedAudit ? format(new Date(selectedAudit.fecha_auditoria), 'dd/MM/yyyy HH:mm') : ''}`, 14, 38);
                    doc.text(`Auditor: ${selectedAudit?.users?.name || 'Desconocido'}`, 14, 44);

                    const resultText = selectedAudit?.total_hallazgos === 0 ? 'Aprobado' : `${selectedAudit?.total_hallazgos} Hallazgos`;
                    doc.text(`Resultado: ${resultText}`, 100, 38);
                    doc.text(`Cumplimiento: ${selectedAudit?.porcentaje_completado}%`, 100, 44);

                    // Add Evidence Images
                    // @ts-ignore
                    let lastY = doc.lastAutoTable.finalY + 10;
                    const evidenceItems = auditDetails.filter(d => d.evidencia_url);

                    if (evidenceItems.length > 0) {
                      doc.addPage(); // Start evidence on a new page usually safer or check Y
                      lastY = 20;
                      doc.setFontSize(14);
                      doc.text("Evidencia Fotográfica de Hallazgos", 14, lastY);
                      lastY += 10;

                      for (let i = 0; i < evidenceItems.length; i++) {
                        const item = evidenceItems[i];
                        const question = selectedAudit ? getQuestionText(selectedAudit.tipo_checklist, item.pregunta_id) : item.pregunta_id;

                        // Check if we need a new page
                        if (lastY > 250) {
                          doc.addPage();
                          lastY = 20;
                        }

                        doc.setFontSize(11);
                        doc.setFont("helvetica", "bold");
                        doc.text(`Pregunta: ${question}`, 14, lastY);
                        lastY += 6;

                        if (item.plan_accion) {
                          doc.setFont("helvetica", "normal");
                          doc.setTextColor(200, 0, 0); // Red
                          doc.text(`Hallazgo: ${item.plan_accion}`, 14, lastY);
                          doc.setTextColor(0); // Reset
                          lastY += 8;
                        }

                        try {
                          // Fetch raw image blobs requires fetch to bypass CORS if configured or proxy
                          // Since Supabase storage is public, we can fetch
                          const response = await fetch(item.evidencia_url!);
                          const blob = await response.blob();

                          // Custom function to verify if blob is valid, simplified here
                          if (blob.size > 0) {
                            // Create a temporary link to read/convert or use FileReader
                            const reader = new FileReader();
                            await new Promise((resolve) => {
                              reader.onloadend = () => {
                                if (reader.result) {
                                  // Add image to PDF
                                  const imgData = reader.result as string;
                                  // Calculate aspect ratio to fit width
                                  // Assuming we want width ~100mm
                                  const imgWidth = 100;
                                  const imgHeight = 75; // 4:3 default

                                  doc.addImage(imgData, 'JPEG', 14, lastY, imgWidth, imgHeight);
                                  lastY += imgHeight + 10;
                                }
                                resolve(true);
                              };
                              reader.readAsDataURL(blob);
                            });
                          }
                        } catch (err) {
                          console.error("Error loading image for PDF", err);
                          doc.text("(Error cargando imagen)", 14, lastY);
                          lastY += 10;
                        }
                      }
                    }

                    doc.save(`checklist_${selectedAudit?.tipo_checklist}_${format(new Date(), 'yyyyMMdd')}.pdf`);
                  } catch (error) {
                    console.error('Error generating PDF:', error);
                    toast.error('Error al generar el PDF.');
                  }
                }}
                className="flex items-center gap-2 bg-gray-800 hover:bg-gray-900 text-white text-sm font-medium py-2 px-4 rounded shadow-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Exportar a PDF
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}