import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { featuresApi } from '@/lib/api'
import { SalaryEstimate as SalaryEstimateType } from '@/types'
import { Job } from '@/types'
import { DollarSign, RefreshCw, X } from 'lucide-react'

interface Props {
  job: Job
  onClose: () => void
}

export default function SalaryEstimate({ job, onClose }: Props) {
  const [result, setResult] = useState<SalaryEstimateType | null>(null)

  const estimateMut = useMutation({
    mutationFn: () => featuresApi.salaryEstimate({
      job_title: job.title,
      description: job.description,
      city: job.city,
    }) as Promise<SalaryEstimateType>,
    onSuccess: (data) => setResult(data),
  })

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card p-6 w-full max-w-md animate-slide-up space-y-4" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-bold flex items-center gap-2">
            <DollarSign size={18} className="text-green-500" />
            تقدير الراتب
          </h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={16} /></button>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
          <p className="text-sm font-medium">{job.title}</p>
          <p className="text-xs text-gray-500">{job.company}</p>
        </div>

        {!result ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              انقري على الزر لتقدير الراتب المتوقع باستخدام AI
            </p>
            <button
              onClick={() => estimateMut.mutate()}
              disabled={estimateMut.isPending}
              className="btn-primary"
            >
              {estimateMut.isPending ? (
                <><RefreshCw size={14} className="animate-spin" />جاري التقدير...</>
              ) : (
                <><DollarSign size={14} />قدّر الراتب</>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Salary range */}
            <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-5 text-center">
              <p className="text-xs text-gray-500 mb-2">الراتب الشهري المتوقع</p>
              <div className="flex items-center justify-center gap-3">
                <div>
                  <p className="text-xs text-gray-400">من</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {result.min.toLocaleString('ar-SA')}
                  </p>
                </div>
                <span className="text-gray-300 text-2xl">—</span>
                <div>
                  <p className="text-xs text-gray-400">إلى</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {result.max.toLocaleString('ar-SA')}
                  </p>
                </div>
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-1">{result.currency} شهرياً</p>
            </div>

            {/* Reasoning */}
            {result.reasoning && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">التبرير:</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{result.reasoning}</p>
              </div>
            )}

            <button
              onClick={() => estimateMut.mutate()}
              disabled={estimateMut.isPending}
              className="btn-secondary text-xs w-full justify-center"
            >
              <RefreshCw size={13} className={estimateMut.isPending ? 'animate-spin' : ''} />
              إعادة التقدير
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
