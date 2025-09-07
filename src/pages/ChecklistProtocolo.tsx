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

export default function ChecklistProtocolo() {
  const [answers, setAnswers] = useState({});
  const [actionPlans, setActionPlans] = useState({});

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Respuestas Protocolo:', answers);
    console.log('Planes de Acción Protocolo:', actionPlans);
    // Aquí iría la lógica para guardar en la base de datos
    alert('Checklist de Protocolo completado. Revisa la consola para ver los datos.');
  };

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = questions.length;
  const percentageCompleted = Math.round((answeredCount / totalQuestions) * 100);
  const findingsCount = Object.values(answers).filter(answer => answer === 'no').length;

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Checklist de Protocolo de Medicamentos</h1>
        <p className="text-gray-600">Verificación de los protocolos de manejo de medicamentos.</p>
      </div>

      <Card className="bg-white p-6">
        <div className="flex justify-between items-center mb-4">
          <Badge variant="outline">Progreso: {percentageCompleted}%</Badge>
          <Badge variant={findingsCount > 0 ? "destructive" : "secondary"}>Hallazgos: {findingsCount}</Badge>
        </div>
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
