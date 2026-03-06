import { Controller } from '@hotwired/stimulus';
import { getComponent } from '@symfony/ux-live-component';

/**
 * Déclenche un LiveAction "loadMore" quand le sentinel entre dans le viewport.
 *
 * Ce controller est placé sur un wrapper intérieur au LiveComponent afin d'éviter
 * le conflit avec data-controller="live" sur l'élément racine.
 *
 * initialize() est utilisé (et non connect()) pour récupérer l'instance du
 * LiveComponent et attacher les hooks — conformément à la documentation officielle.
 * initialize() ne s'exécutant qu'une seule fois par instance, cela évite
 * l'accumulation de listeners render:finished en cas de reconnexions multiples.
 *
 * connect() gère les reconnexions (après un disconnect/connect du même élément).
 */
export default class extends Controller {
    static values  = { hasMore: Boolean };
    static targets = ['sentinel'];

    /** @type {IntersectionObserver|null} */
    #observer = null;

    /** @type {import('@symfony/ux-live-component').Component|null} */
    #component = null;

    #loading = false;

    async initialize() {
        const liveEl = this.element.closest('[data-controller~="live"]');

        if (!liveEl) {
            console.error('[infinite-scroll] Élément LiveComponent parent introuvable.');
            return;
        }

        this.#component = await getComponent(liveEl);

        // S'exécute après chaque re-render morphdom réussi
        this.#component.on('render:finished', () => {
            this.#loading = false;
            this.#setupObserver();
        });

        // Libère le verrou si la requête échoue (réseau, 5xx…)
        // render:finished ne se déclenche pas en cas d'erreur
        this.#component.on('response:error', () => {
            this.#loading = false;
        });

        this.#setupObserver();
    }

    connect() {
        // initialize() ne s'exécute qu'une fois par instance.
        // connect() gère les reconnexions : si le composant est déjà prêt,
        // on recrée l'observer (l'ancien ayant été détruit dans disconnect()).
        if (this.#component) {
            this.#setupObserver();
        }
    }

    disconnect() {
        this.#teardownObserver();
    }

    #setupObserver() {
        this.#teardownObserver();

        if (!this.hasMoreValue || !this.hasSentinelTarget) {
            return;
        }

        this.#observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting || this.#loading) return;
                this.#loading = true;
                this.#component.action('loadMore');
            },
            { rootMargin: '0px 0px 200px 0px', threshold: 0 },
        );

        this.#observer.observe(this.sentinelTarget);
    }

    #teardownObserver() {
        this.#observer?.disconnect();
        this.#observer = null;
    }
}
