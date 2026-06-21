import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Clock, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, Badge, SkeletonList } from '@/components/ui';
import { ARTICLE_CATEGORIES } from '@/lib/constants';
import { cn } from '@/lib/tokens';
import { usePageTitle } from '@/hooks/usePageTitle';
import { DEMO_ARTICLES } from '@/lib/demoArticles';

interface Article {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  read_time_minutes: number;
  is_featured: boolean;
}

export function CareArticlesPage() {
  usePageTitle('Care articles');
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('education_articles')
          .select('id, slug, title, summary, category, read_time_minutes, is_featured')
          .order('is_featured', { ascending: false });
        if (!fetchError && data && data.length > 0) {
          setArticles(data);
        } else {
          setArticles(DEMO_ARTICLES);
        }
      } catch {
        setArticles(DEMO_ARTICLES);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="page-container pb-8 page-enter">
      <Link to="/care" className="mb-4 inline-flex text-caption font-medium text-brand-600">
        ← Back to Care
      </Link>
      <PageHeader title="Education library" subtitle="Articles to support your health journey" />

      {loading ? (
        <SkeletonList count={3} />
      ) : articles.length === 0 ? (
        <Card className="py-12 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-ink-muted" strokeWidth={1.5} />
          <p className="mt-4 text-caption font-medium text-ink">No articles yet</p>
          <p className="mt-2 text-micro text-ink-secondary">
            Explore the Care journey tabs for cycle education and doctor prep guides.
          </p>
          <Link to="/care" className="mt-4 inline-block text-caption font-semibold text-brand-600">
            Back to Care
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {articles.map((article, i) => (
            <Link key={article.id} to={`/care/articles/${article.slug}`} className="block group">
              <Card interactive padding="sm" className={cn('animate-slide-up', `stagger-${Math.min(i + 1, 5)}`)}>
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">
                        {ARTICLE_CATEGORIES[article.category as keyof typeof ARTICLE_CATEGORIES] || article.category}
                      </Badge>
                      {article.is_featured && <Badge variant="brand">Featured</Badge>}
                    </div>
                    <p className="text-caption font-semibold text-ink group-hover:text-brand-600 transition-colors">
                      {article.title}
                    </p>
                    <p className="mt-1 text-micro text-ink-secondary line-clamp-2">{article.summary}</p>
                    <div className="mt-2 flex items-center gap-1 text-micro text-ink-tertiary">
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      {article.read_time_minutes} min read
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-ink-muted group-hover:text-brand-500" aria-hidden="true" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
