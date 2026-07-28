import React from 'react';
import { 
  AlertTriangle, 
  Clock, 
  Upload, 
  UserCheck 
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

export default function WorkspaceDashboard() {
  // Mock data for the line chart
  const lineData = {
    labels: ['Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul'],
    datasets: [
      {
        label: 'Entregados',
        data: [6, 8, 5, 9, 7, 10],
        borderColor: '#4F46E5',
        backgroundColor: 'rgba(79,70,229,0.08)',
        fill: true,
        tension: 0.35,
        pointRadius: 3,
      },
      {
        label: 'Límite regulatorio',
        data: [7, 7, 7, 8, 9, 9],
        borderColor: '#D1D5DB',
        borderDash: [4, 4],
        pointRadius: 0,
        tension: 0.35,
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, grid: { color: '#F3F4F6' } },
      x: { grid: { display: false } },
    },
  };

  // Mock data for the doughnut chart
  const doughnutData = {
    labels: ['Vencido', 'Pendiente', 'Borrador', 'Finalizado'],
    datasets: [
      {
        data: [7, 46, 18, 24],
        backgroundColor: ['#B91C1C', '#B45309', '#4F46E5', '#047857'],
        borderWidth: 2,
        borderColor: '#fff',
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    cutout: '65%',
  };

  return (
    <div className="font-sans p-6 max-w-7xl mx-auto space-y-4 text-gray-900">
      
      {/* Alert Section */}
      <div className="bg-indigo-600 rounded-xl px-5 py-3.5 flex items-center justify-between text-white shadow-sm">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-indigo-100" />
          <span className="text-sm font-medium">
            3 IPS vencen en los próximos 15 días — el más urgente: <strong>TOPIRAMAX 50mg</strong> (F. Límite: 12-02-2027)
          </span>
        </div>
        <button className="bg-white text-indigo-800 border-none rounded-md px-3.5 py-1.5 text-xs font-semibold cursor-pointer hover:bg-indigo-50 transition-colors">
          Ver detalle
        </button>
      </div>

      {/* KPI Cards Section */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500 mb-1">Total IPS activos</p>
          <p className="text-2xl font-semibold text-gray-900">95</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500 mb-1">Vencidos</p>
          <p className="text-2xl font-semibold text-red-700">7</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500 mb-1">Próx. 30 días</p>
          <p className="text-2xl font-semibold text-amber-700">12</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500 mb-1">En borrador</p>
          <p className="text-2xl font-semibold text-gray-900">18</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500 mb-1">% a tiempo</p>
          <p className="text-2xl font-semibold text-emerald-700">86%</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4">
        
        {/* Line Chart */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <p className="text-sm font-semibold text-gray-900 mb-3">Entregas de IPS por mes</p>
          <div className="relative h-[220px]">
            <Line data={lineData} options={lineOptions} />
          </div>
        </div>

        {/* Doughnut Chart */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col">
          <p className="text-sm font-semibold text-gray-900 mb-2">Distribución por estado</p>
          <div className="relative h-[160px] flex-1">
            <Doughnut data={doughnutData} options={doughnutOptions} />
          </div>
          <div className="flex flex-col gap-1 mt-4 text-xs font-medium text-gray-600">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-700"></span>
              <span>Vencido 7</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-700"></span>
              <span>Pendiente 46</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-indigo-600"></span>
              <span>Borrador 18</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-700"></span>
              <span>Finalizado 24</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tables and Notifications Section */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4">
        
        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <p className="text-sm font-semibold text-gray-900 mb-3">Próximos a entregar</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-gray-500 border-b border-gray-100">
                  <th className="font-semibold pb-2 font-medium">Producto</th>
                  <th className="font-semibold pb-2 font-medium">Asignado</th>
                  <th className="font-semibold pb-2 font-medium">F. Límite</th>
                  <th className="font-semibold pb-2 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                <tr>
                  <td className="py-2.5 text-gray-900 font-medium">TOPIRAMAX 50mg</td>
                  <td className="py-2.5 text-gray-600">M. Torres</td>
                  <td className="py-2.5 text-gray-600">12-02-2027</td>
                  <td className="py-2.5">
                    <span className="bg-red-100 text-red-700 text-xs px-2.5 py-0.5 rounded-full font-medium">Vencido</span>
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 text-gray-900 font-medium">SOLPREX 10mg</td>
                  <td className="py-2.5 text-gray-600">J. Ramos</td>
                  <td className="py-2.5 text-gray-600">25-02-2027</td>
                  <td className="py-2.5">
                    <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-0.5 rounded-full font-medium">Pendiente</span>
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 text-gray-900 font-medium">TRANDATE 100mg</td>
                  <td className="py-2.5 text-gray-600">M. Torres</td>
                  <td className="py-2.5 text-gray-600">07-03-2027</td>
                  <td className="py-2.5">
                    <span className="bg-indigo-50 text-indigo-700 text-xs px-2.5 py-0.5 rounded-full font-medium">Borrador</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <p className="text-sm font-semibold text-gray-900 mb-4">Notificaciones</p>
          <div className="flex flex-col gap-4">
            <div className="flex gap-3 items-start">
              <Clock className="text-red-700 w-4 h-4 mt-0.5 shrink-0" />
              <span className="text-sm text-gray-600">TOPIRAMAX venció hace 2 días</span>
            </div>
            <div className="flex gap-3 items-start">
              <Upload className="text-indigo-600 w-4 h-4 mt-0.5 shrink-0" />
              <span className="text-sm text-gray-600">Nuevo expediente ERLOTINIB en Gestión Documental</span>
            </div>
            <div className="flex gap-3 items-start">
              <UserCheck className="text-emerald-700 w-4 h-4 mt-0.5 shrink-0" />
              <span className="text-sm text-gray-600">LEFLUMARD reasignado a J. Ramos</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
