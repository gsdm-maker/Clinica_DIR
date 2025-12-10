import React, { useState, useRef } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import imageCompression from 'browser-image-compression';

import {
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

export default function ChecklistProtocolo() {
  const { user } = useAuth();
  const submissionLock = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [actionPlans, setActionPlans] = useState<Record<string, string>>({});
  const [evidenceUrls, setEvidenceUrls] = useState<Record<string, string>>({});

  const questions = [
    { id: 'q1', text: '¿Se aplica el sistema FIFO (First In, First Out)?' },
    { id: 'q2', text: '¿Todos los productos están correctamente etiquetados?' },
    { id: 'q3', text: '¿Se verifica regularmente las fechas de vencimiento?' },
    { id: 'q4', text: '¿Se mantiene la cadena de frío para productos que lo requieren?' },
    { id: 'q5', text: '¿Los medicamentos están segregados según sus características?' },
    { id: 'q6', text: '¿Los medicamentos controlados están en área segura?' },
    { id: 'q7', text: '¿Se documenta correctamente cada movimiento?' },
    { id: 'q8', text: '¿El personal está capacitado en protocolos de almacenamiento?' }
  ];

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleActionPlanChange = (questionId: string, value: string) => {
    setActionPlans(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submissionLock.current) return;
    submissionLock.current = true;
    setIsSubmitting(true);

    try {
      if (!user) {
        toast.error('Debe iniciar sesión para completar el checklist.');
        return;
      }

      if (Object.keys(answers).length !== questions.length) {
        toast.error('Por favor, responde todas las preguntas antes de completar el checklist.');
        return;
      }

      const answeredCount = Object.keys(answers).length;
      const totalQuestions = questions.length;
      const percentageCompleted = Math.round((answeredCount / totalQuestions) * 100);
      const findingsCount = Object.values(answers).filter(answer => answer === 'no').length;

      const auditData = {
        tipo_checklist: 'protocolo', // Changed type to 'protocolo'
        usuario_id: user.id,
        porcentaje_completado: percentageCompleted,
        total_hallazgos: findingsCount,
        observaciones_generales: null,
      };

      const { data: newAudit, error: auditError } = await supabase
        .from('auditorias_checklist')
        .insert([auditData])
        .select('id')
        .single();

      if (auditError) {
        console.error('Error inserting audit:', auditError);
        toast.error('Error al guardar el checklist principal.');
        return;
      }

      const auditId = newAudit.id;

      const questionsToInsert = questions.map(q => ({
        auditoria_id: auditId,
        pregunta_id: q.id,
        respuesta: answers[q.id],
        plan_accion: answers[q.id] === 'no' ? (actionPlans[q.id] || null) : null,
        evidencia_url: evidenceUrls[q.id] || null,
      }));

      const { error: questionsError } = await supabase
        .from('auditoria_preguntas')
        .insert(questionsToInsert);

      if (questionsError) {
        console.error('Error inserting questions:', questionsError);
        toast.error('Error al guardar las respuestas del checklist.');
        return;
      }

      toast.success('Checklist de Protocolo completado y guardado exitosamente!');
      setAnswers({});
      setActionPlans({});
      setEvidenceUrls({});

    } catch (error: any) {
      console.error('Error completing checklist:', error);
      toast.error(error.message || 'Ocurrió un error al completar el checklist.');
    } finally {
      submissionLock.current = false;
      setIsSubmitting(false);
    }
  };

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = questions.length;
  const percentageCompleted = Math.round((answeredCount / totalQuestions) * 100);
  const findingsCount = Object.values(answers).filter(answer => answer === 'no').length;

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Checklist de Protocolo</h1>
        <p className="text-gray-600">Verificación de los protocolos de almacenamiento y manejo.</p>
      </div>

      <Card className="bg-white p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-between items-center mb-4">
            <Badge variant="default">Progreso: {percentageCompleted}%</Badge>
            <Badge variant={findingsCount > 0 ? "danger" : "info"}>Hallazgos: {findingsCount}</Badge>
          </div>
          {questions.map((q, index) => (
            <div key={q.id} className="border-b pb-4 last:border-b-0 last:pb-0">
              <p className="font-medium text-gray-800 mb-2">{index + 1}. {q.text}</p>
              <div className="flex items-center space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name={q.id}
                    value="yes"
                    checked={answers[q.id] === 'yes'}
                    onChange={() => handleAnswerChange(q.id, 'yes')}
                    className="form-radio text-green-600 h-5 w-5"
                  />
                  <span className="ml-2 text-green-600">SÍ</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name={q.id}
                    value="no"
                    checked={answers[q.id] === 'no'}
                    onChange={() => handleAnswerChange(q.id, 'no')}
                    className="form-radio text-red-600 h-5 w-5"
                  />
                  <span className="ml-2 text-red-600">NO</span>
                </label>
              </div>

              {answers[q.id] === 'no' && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span className="text-red-800 font-medium">Hallazgo identificado - Plan de Acción</span>
                  </div>
                  <textarea
                    placeholder="Describe el plan de acción para este hallazgo..."
                    value={actionPlans[q.id] || ''}
                    onChange={(e) => handleActionPlanChange(q.id, e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                    rows={3}
                  ></textarea>

                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Evidencia Fotográfica (Opcional)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const options = {
                              maxSizeMB: 1,
                              maxWidthOrHeight: 1920,
                              useWebWorker: true,
                              initialQuality: 0.8
                            };

                            const compressedFile = await imageCompression(file, options);

                            const fileExt = file.name.split('.').pop();
                            const fileName = `${Math.random()}.${fileExt}`;
                            const filePath = `${fileName}`;

                            toast.promise(
                              supabase.storage.from('checklist-evidence').upload(filePath, compressedFile),
                              {
                                loading: 'Comprimiendo y subiendo...',
                                success: 'Imagen guardada',
                                error: 'Error al subir',
                              }
                            ).then(({ data, error }) => {
                              if (!error && data) {
                                const { data: { publicUrl } } = supabase.storage.from('checklist-evidence').getPublicUrl(filePath);
                                setEvidenceUrls(prev => ({ ...prev, [q.id]: publicUrl }));
                              }
                            });
                          } catch (error) {
                            console.error('Error uploading:', error);
                            toast.error('Error al procesar la imagen');
                          }
                        }
                      }}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {evidenceUrls[q.id] && (
                      <p className="mt-1 text-xs text-green-600 flex items-center">
                        <CheckCircle className="w-3 h-3 mr-1" /> Imagen adjuntada exitosamente
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          <div className="flex justify-end mt-6">
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Completar Checklist'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}