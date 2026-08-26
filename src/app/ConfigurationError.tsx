import type { PublicEnvironmentVariable } from '../shared/config/environment'

type ConfigurationErrorProps = {
  missingVariables: readonly PublicEnvironmentVariable[]
}

export default function ConfigurationError({
  missingVariables,
}: ConfigurationErrorProps) {
  return (
    <main className="startup-status" role="alert">
      <section>
        <p>پیکربندی برنامه کامل نیست</p>
        <h1>اتصال امن برنامه آماده نشده است.</h1>
        <span>
          متغیرهای زیر را مطابق فایل <code>.env.example</code> تنظیم کنید:
        </span>
        <ul dir="ltr">
          {missingVariables.map((variableName) => (
            <li key={variableName}>
              <code>{variableName}</code>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
