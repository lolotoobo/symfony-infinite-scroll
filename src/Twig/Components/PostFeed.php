<?php

namespace App\Twig\Components;

use Symfony\Contracts\HttpClient\HttpClientInterface;
use Symfony\UX\LiveComponent\Attribute\AsLiveComponent;
use Symfony\UX\LiveComponent\Attribute\LiveAction;
use Symfony\UX\LiveComponent\Attribute\LiveProp;
use Symfony\UX\LiveComponent\DefaultActionTrait;

#[AsLiveComponent]
class PostFeed
{
    use DefaultActionTrait;

    private const int LIMIT = 9;
    private const string API_URL = 'https://dummyjson.com/posts';

    /**
     * Page courante (LiveProp : persisté entre les requêtes AJAX).
     */
    #[LiveProp]
    public int $page = 1;

    #[LiveProp]
    public bool $hasMore = true;

    /** Exposé au template pour le loop des skeletons. */
    public int $perPage = self::LIMIT;

    /**
     * Posts de la PAGE COURANTE uniquement — pas un LiveProp.
     * Chargé à la volée sur chaque requête ; les pages précédentes restent
     * dans le DOM grâce à data-live-ignore sur chaque item individuel.
     *
     * @var array<int, array<string, mixed>>
     */
    public array $currentPosts = [];

    public function __construct(private readonly HttpClientInterface $httpClient)
    {
    }

    public function mount(): void
    {
        $this->loadPage();
    }

    #[LiveAction]
    public function loadMore(): void
    {
        if (!$this->hasMore) {
            return;
        }

        $this->page++;
        $this->loadPage();
    }

    private function loadPage(): void
    {
        $data = $this->httpClient
            ->request('GET', self::API_URL, [
                'query' => [
                    'limit'  => self::LIMIT,
                    'skip'   => ($this->page - 1) * self::LIMIT,
                    'select' => 'id,title,body,tags,reactions,views',
                ],
            ])
            ->toArray();

        $this->currentPosts = $data['posts'] ?? [];
        $this->hasMore      = ($this->page * self::LIMIT) < ($data['total'] ?? 0);
    }
}
