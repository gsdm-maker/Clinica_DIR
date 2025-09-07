import React, { useState, useRef } from 'react'; // Added useRef
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { supabase } from '../lib/supabase'; // Import supabase
import { useAuth } from '../contexts/AuthContext'; // Import useAuth
import toast from 'react-hot-toast'; // Import toast

import {
  ClipboardList,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

export default function ChecklistAlmacenamiento() {
  const { user } = useAuth(); // Get user from auth context
  const submissionLock = useRef(false); // Submission lock
  const [isSubmitting, setIsSubmitting] = useState(false); // UI state for submitting

  const [answers, setAnswers] = useState({});
  const [actionPlans, setActionPlans] = useState({});

  const questions = [
    { id: 'q1', text: '¿La temperatura del almacén está entre 15-25°C?' },
    { id: 'q2', text: '¿La humedad relativa está controlada (45-65%)?' },
    { id: 'q3', text: '¿La iluminación es adecuada y no afecta los productos?' },
    { id: 'q4', text: '¿El sistema de ventilación funciona correctamente?' },
    { id: 'q5', text: '¿Las áreas de almacenamiento están limpias?' },
    { id: 'q6', text: '¿Los productos están organizados correctamente?' },
    { id: 'q7', text: '¿Hay separación adecuada entre diferentes tipos de productos?' },
    { id: 'q8', text: '¿El acceso al almacén está controlado?' }
  ];

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleActionPlanChange = (questionId: string, value: string) => {
    setActionPlans(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => { // Made async
    e.preventDefault();
    if (submissionLock.current) return; // Prevent double submission
    submissionLock.current = true;
    setIsSubmitting(true);

    try {
      if (!user) {
        toast.error('Debe iniciar sesión para completar el checklist.');
        return;
      }

      // 1. Validate all questions are answered
      if (Object.keys(answers).length !== questions.length) {
        toast.error('Por favor, responde todas las preguntas antes de completar el checklist.');
        return;
      }

      // 2. Prepare main audit record
      const answeredCount = Object.keys(answers).length;
      const totalQuestions = questions.length;
      const percentageCompleted = Math.round((answeredCount / totalQuestions) * 100);
      const findingsCount = Object.values(answers).filter(answer => answer === 'no').length;

      const auditData = {
        tipo_checklist: 'almacenamiento', // Fixed type
        usuario_id: user.id,
        porcentaje_completado: percentageCompleted,
        total_hallazgos: findingsCount,
        observaciones_generales: null, // No general observations field in UI yet
      };

      // 3. Insert main audit record
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

      // 4. Prepare questions data
      const questionsToInsert = questions.map(q => ({
        auditoria_id: auditId,
        pregunta_id: q.id,
        respuesta: answers[q.id],
        plan_accion: answers[q.id] === 'no' ? (actionPlans[q.id] || null) : null,
        evidencia_url: null, // No photo upload yet
      }));

      // 5. Insert questions data
      const { error: questionsError } = await supabase
        .from('auditoria_preguntas')
        .insert(questionsToInsert);

      if (questionsError) {
        console.error('Error inserting questions:', questionsError);
        toast.error('Error al guardar las respuestas del checklist.');
        return;
      }

      toast.success('Checklist de Almacenamiento completado y guardado exitosamente!');
      // Clear form
      setAnswers({});
      setActionPlans({});

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
        <h1 className="text-2xl font-bold text-gray-900">Checklist de Almacenamiento</h1>
        <p className="text-gray-600">Verificación de las condiciones del almacén.</p>
      </div>

      <Card className="bg-white p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-between items-center mb-4">
            <Badge variant="outline">Progreso: {percentageCompleted}%</Badge>
            <Badge variant={findingsCount > 0 ? "destructive" : "secondary"}>Hallazgos: {findingsCount}</Badge>
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