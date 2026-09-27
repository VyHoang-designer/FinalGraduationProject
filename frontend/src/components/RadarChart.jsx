// ==============================================================================
// FILE: frontend/src/components/RadarChart.jsx
// MÔ TẢ: Radar Chart comparing CV vs JD across key metrics
// ==============================================================================

import { Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

/**
 * Maps feature_details dict into radar chart data.
 * Normalizes values to 0-1 range for display.
 */
function normalizeFeatures(features) {
  const labels = [];
  const values = [];

  // Human-readable label mapping
  const labelMap = {
    'Exp_Diff': 'Kinh nghiệm',
    'Skill_Match_Ratio': 'Kỹ năng',
    'JD_Similarity_Score': 'Ngữ nghĩa JD',
    'Project_Similarity_Score': 'Dự án',
    'Has_Degree': 'Bằng cấp',
    'Has_Live_Deployment': 'Deploy thực tế',
    'Has_English_Cert': 'Tiếng Anh',
    'Has_Leadership': 'Lãnh đạo',
    'Has_Award': 'Giải thưởng',
  };

  for (const [key, value] of Object.entries(features)) {
    labels.push(labelMap[key] || key);

    // Normalize: binary features are 0/1, ratios are 0-1, Exp_Diff needs special handling
    let normalized;
    if (key === 'Exp_Diff') {
      // Map -5..+5 range to 0..1
      normalized = Math.max(0, Math.min(1, (value + 5) / 10));
    } else if (value > 1) {
      normalized = Math.min(value / 100, 1);
    } else {
      normalized = Math.max(0, Math.min(1, value));
    }
    values.push(normalized);
  }

  return { labels, values };
}

export default function RadarChartComponent({ featureDetails, jobTitle }) {
  const { labels, values } = normalizeFeatures(featureDetails);

  const data = {
    labels,
    datasets: [
      {
        label: 'CV Score',
        data: values,
        backgroundColor: 'rgba(99, 102, 241, 0.15)',
        borderColor: 'rgba(99, 102, 241, 0.8)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(99, 102, 241, 1)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'JD Threshold',
        data: values.map(() => 0.6),
        backgroundColor: 'rgba(248, 113, 113, 0.05)',
        borderColor: 'rgba(248, 113, 113, 0.4)',
        borderWidth: 1,
        borderDash: [5, 5],
        pointRadius: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: 'rgba(148, 163, 184, 0.9)',
          font: { size: 12, family: "'Inter', sans-serif" },
          padding: 16,
          usePointStyle: true,
          pointStyleWidth: 12,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#e2e8f0',
        bodyColor: '#cbd5e1',
        borderColor: 'rgba(99, 102, 241, 0.3)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        titleFont: { family: "'Inter', sans-serif", weight: 600 },
        bodyFont: { family: "'Inter', sans-serif" },
        callbacks: {
          label: (ctx) => {
            if (ctx.datasetIndex === 1) return null;
            const rawVal = Object.values(featureDetails)[ctx.dataIndex];
            return ` ${ctx.label}: ${typeof rawVal === 'number' ? rawVal.toFixed(4) : rawVal}`;
          },
        },
      },
    },
    scales: {
      r: {
        beginAtZero: true,
        max: 1,
        ticks: {
          stepSize: 0.2,
          color: 'rgba(148, 163, 184, 0.4)',
          backdropColor: 'transparent',
          font: { size: 10 },
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.1)',
        },
        angleLines: {
          color: 'rgba(148, 163, 184, 0.1)',
        },
        pointLabels: {
          color: 'rgba(226, 232, 240, 0.8)',
          font: { size: 11, family: "'Inter', sans-serif", weight: 500 },
        },
      },
    },
  };

  return (
    <div className="radar-chart">
      <Radar data={data} options={options} />
    </div>
  );
}
