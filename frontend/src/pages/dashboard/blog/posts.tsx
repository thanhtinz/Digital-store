import orderBy from 'lodash/orderBy';
import { useEffect, useCallback, useState } from 'react';
// next
import Head from 'next/head';
import NextLink from 'next/link';
// @mui
import { Grid, Button, Container, Stack, Typography } from '@mui/material';
// utils
import axios from '../../../utils/axios';
// routes
import { PATH_DASHBOARD } from '../../../routes/paths';
// @types
import { IBlogPost } from '../../../@types/blog';
// layouts
import DashboardLayout from '../../../layouts/dashboard';
// components
import Iconify from '../../../components/iconify';
import { SkeletonPostItem } from '../../../components/skeleton';
import { useSettingsContext } from '../../../components/settings';
// locales
import { useLocales } from '../../../locales';
// sections
import { BlogPostCard, BlogPostsSort, BlogPostsSearch } from '../../../sections/@dashboard/blog';

// ----------------------------------------------------------------------

// ----------------------------------------------------------------------

BlogPostsPage.getLayout = (page: React.ReactElement) => <DashboardLayout disableGuard>{page}</DashboardLayout>;

// ----------------------------------------------------------------------

export default function BlogPostsPage() {
  const { themeStretch } = useSettingsContext();
  const { translate } = useLocales();
  const tb = (k: string) => `${translate(`blog_page.${k}`)}`;

  const SORT_OPTIONS = [
    { value: 'latest', label: tb('sort_latest') },
    { value: 'popular', label: tb('sort_popular') },
    { value: 'oldest', label: tb('sort_oldest') },
  ];

  const [posts, setPosts] = useState([]);

  const [loaded, setLoaded] = useState(false);

  const [sortBy, setSortBy] = useState('latest');

  const sortedPosts = applySortBy(posts, sortBy);

  const getAllPosts = useCallback(async () => {
    try {
      const response = await axios.get('/api/blog/posts');
      // Backend trả { total, page, items: [...] }. Hỗ trợ cả 'posts' để an toàn.
      setPosts(response.data.items || response.data.posts || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    getAllPosts();
  }, [getAllPosts]);

  const handleChangeSortBy = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSortBy(event.target.value);
  };

  return (
    <>
      <Head>
        <title> Blog | Digital Store</title>
      </Head>

      <Container maxWidth={themeStretch ? false : 'lg'} sx={{ pt: { xs: 3, md: 5 } }}>
        <Typography variant="h4" sx={{ mb: 4 }}>
          {tb('title')}
        </Typography>

        <Stack mb={5} direction="row" alignItems="center" justifyContent="space-between">
          <BlogPostsSearch />
          <BlogPostsSort sortBy={sortBy} sortOptions={SORT_OPTIONS} onSort={handleChangeSortBy} />
        </Stack>

        <Grid container spacing={3}>
          {(!loaded ? [...Array(12)] : sortedPosts).map((post, index) =>
            post ? (
              <Grid key={post.id} item xs={12} sm={6} md={(index === 0 && 6) || 3}>
                <BlogPostCard post={post} index={index} />
              </Grid>
            ) : (
              <SkeletonPostItem key={index} />
            )
          )}
        </Grid>

        {loaded && !posts.length && (
          <Stack alignItems="center" sx={{ py: 10, color: 'text.secondary' }}>
            <Iconify icon="solar:document-text-bold-duotone" width={56} sx={{ mb: 1, opacity: 0.5 }} />
            <Typography variant="body2">{tb('empty')}</Typography>
          </Stack>
        )}
      </Container>
    </>
  );
}

// ----------------------------------------------------------------------

const applySortBy = (posts: IBlogPost[], sortBy: string) => {
  if (sortBy === 'latest') {
    return orderBy(posts, ['createdAt'], ['desc']);
  }

  if (sortBy === 'oldest') {
    return orderBy(posts, ['createdAt'], ['asc']);
  }

  if (sortBy === 'popular') {
    return orderBy(posts, ['view'], ['desc']);
  }
  return posts;
};
