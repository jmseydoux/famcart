export default function About() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">À propos de FamCart</h1>

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4 text-gray-700 leading-relaxed">
        <p>
          <strong>FamCart</strong> est une application de gestion de listes de courses
          conçue pour les ménages. Elle permet aux membres d'une famille ou d'un foyer
          de partager une liste commune et de se coordonner lors des courses.
        </p>
        <p>
          N'importe quel membre peut ajouter des articles à la liste, en précisant la
          quantité, l'unité et le magasin souhaité. Lorsqu'un membre part faire les
          courses, il démarre une <em>session</em> et coche les articles au fur et à
          mesure — achetés ou indisponibles. Les modifications sont visibles en temps
          réel par tous les membres.
        </p>
        <p>
          À la fin de la session, elle est archivée dans l'historique pour garder une
          trace des courses passées.
        </p>

        <hr className="border-gray-100" />

        <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <dt className="font-medium text-gray-500">Version</dt>
          <dd>0.1 — infrastructure</dd>
          <dt className="font-medium text-gray-500">Frontend</dt>
          <dd>React 18 + TypeScript + Vite</dd>
          <dt className="font-medium text-gray-500">Backend</dt>
          <dd>Node.js + Express + Prisma</dd>
          <dt className="font-medium text-gray-500">Base de données</dt>
          <dd>PostgreSQL (Supabase)</dd>
          <dt className="font-medium text-gray-500">Auteur</dt>
          <dd>JMS</dd>
        </dl>
      </div>
    </div>
  )
}
