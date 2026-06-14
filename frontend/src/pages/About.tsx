import { APP_VERSION } from '../lib/version'

export default function About() {
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">À propos de FamCart</h1>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4 text-gray-700 leading-relaxed">
        <p>
          <strong>FamCart</strong> est une application de gestion de listes de courses
          conçue pour les ménages. Elle permet aux membres d'une famille ou d'un foyer
          de partager des listes communes et de se coordonner lors des courses.
        </p>

        <hr className="border-gray-100" />

        <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <dt className="font-medium text-gray-500">Version</dt>
          <dd>{APP_VERSION}</dd>
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

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5 text-gray-700 leading-relaxed">
        <h2 className="text-lg font-semibold text-gray-900">Mode d'emploi</h2>

        <section className="space-y-1.5">
          <h3 className="font-semibold text-blue-700">1. Rejoindre ou créer un ménage</h3>
          <p className="text-sm">
            Au premier lancement, créez un ménage ou rejoignez-en un existant via le
            code d'invitation de 6 caractères partagé par un membre. Tous les membres
            d'un même ménage partagent les mêmes listes.
          </p>
        </section>

        <section className="space-y-1.5">
          <h3 className="font-semibold text-blue-700">2. Gérer les fournisseurs</h3>
          <p className="text-sm">
            Dans les réglages du ménage, ajoutez vos magasins habituels (Lidl, Carrefour…).
            Chaque liste peut être associée à un fournisseur pour organiser les courses
            par magasin.
          </p>
        </section>

        <section className="space-y-1.5">
          <h3 className="font-semibold text-blue-700">3. Créer une liste</h3>
          <p className="text-sm">
            Depuis l'accueil, créez une liste et associez-lui un fournisseur si vous le
            souhaitez. Plusieurs listes peuvent coexister (une par magasin par exemple).
          </p>
        </section>

        <section className="space-y-1.5">
          <h3 className="font-semibold text-blue-700">4. Ajouter des articles</h3>
          <p className="text-sm">
            Dans une liste, appuyez sur <strong>+</strong> pour ajouter un article.
            Précisez le nom, la quantité, l'unité et optionnellement le magasin.
            Vous pouvez aussi choisir un article depuis le catalogue de produits favoris.
          </p>
        </section>

        <section className="space-y-1.5">
          <h3 className="font-semibold text-blue-700">5. Faire les courses</h3>
          <p className="text-sm">
            Quand vous êtes au magasin, appuyez sur <strong>Démarrer les courses</strong>.
            La liste passe en mode courses : cochez chaque article au fur et à mesure —
            acheté ou introuvable. Les autres membres voient la session en cours en temps réel.
          </p>
        </section>

        <section className="space-y-1.5">
          <h3 className="font-semibold text-blue-700">6. Terminer la session</h3>
          <p className="text-sm">
            Appuyez sur <strong>Terminer les courses</strong> en fin de session. La liste
            est archivée et consultable dans l'historique. Les articles non cochés sont
            automatiquement reportés.
          </p>
        </section>

        <section className="space-y-1.5">
          <h3 className="font-semibold text-blue-700">7. Catalogue de produits</h3>
          <p className="text-sm">
            L'onglet <strong>Produits</strong> vous permet de gérer un catalogue partagé
            entre les membres du ménage. Les produits favoris s'affichent en priorité
            lors de l'ajout d'un article, filtrés par fournisseur.
          </p>
        </section>
      </div>
    </div>
  )
}
