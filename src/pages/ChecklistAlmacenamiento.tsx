import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

// Usaremos elementos HTML básicos para Textarea, RadioGroup y Label
// ya que los componentes de UI específicos no están disponibles o causaron problemas.

import { 
  ClipboardList, 
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

export default function ChecklistAlmacenamiento() {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Respuestas:', answers);
    console.log('Planes de Acción:', actionPlans);
    // Aquí iría la lógica para guardar en la base de datos
    alert('Checklist completado. Revisa la consola para ver los datos.');
  };

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = questions.length;
  const percentageCompleted = Math.round((answeredCount / totalQuestions) * 100);
  const findingsCount = Object.values(answers).filter(answer => answer === 'no').length;

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Checklist de Almacenamiento</h1>
          <p className="text-gray-600">Verificación de las condiciones del almacén.</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline">Progreso: {percentageCompleted}%</Badge>
          <Badge variant={findingsCount > 0 ? "destructive" : "secondary"}>Hallazgos: {findingsCount}</Badge>
        </div>
      </div>

      <Card className="bg-white p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
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
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              <CheckCircle className="w-4 h-4 mr-2" />
              Completar Checklist
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
