# Playto Community Feed - Explainer

## The Tree

Nested comments are modeled using an adjacency list: each `Comment` has a
nullable `parent` pointing to another `Comment` in the same `Post`. To avoid
N+1 queries, the API fetches all comments for a post in a single query with
`select_related("author")` and an annotated `like_count`, then builds the tree
in memory. The threaded tree is returned from `GET /api/posts/:id/comments/`,
and pagination is applied to *root* comments after the tree is built.

Relevant flow:
- Query all comments for the post once.
- Serialize to a flat list (including `parent_id`).
- Build a tree by indexing nodes by `id` and attaching children in memory.
- Paginate the root-level nodes (limit/offset) without extra queries.

This ensures that a post with 50 nested comments is still served in a constant
number of queries (post + comments), not per-comment queries.

## The Math

The leaderboard aggregates only likes created in the last 24 hours without
storing daily totals on the user model. The QuerySet uses subqueries to avoid
join multiplication:

```python
since = timezone.now() - timedelta(hours=24)

post_like_subquery = (
    PostLike.objects.filter(post__author=OuterRef("pk"), created_at__gte=since)
    .values("post__author")
    .annotate(
        total=ExpressionWrapper(
            Count("id") * Value(5), output_field=IntegerField()
        )
    )
    .values("total")
)
comment_like_subquery = (
    CommentLike.objects.filter(comment__author=OuterRef("pk"), created_at__gte=since)
    .values("comment__author")
    .annotate(
        total=ExpressionWrapper(
            Count("id") * Value(1), output_field=IntegerField()
        )
    )
    .values("total")
)

users = (
    User.objects.annotate(
        post_karma=Coalesce(Subquery(post_like_subquery), Value(0)),
        comment_karma=Coalesce(Subquery(comment_like_subquery), Value(0)),
    )
    .annotate(karma=F("post_karma") + F("comment_karma"))
    .filter(karma__gt=0)
    .order_by("-karma", "id")[:5]
)
```

## The AI Audit

The AI initially suggested a single `annotate()` with joins across both
`post_likes` and `comment_likes`. That approach double-counted karma when a
user had both types of likes because the joins multiplied rows. I replaced it
with two subqueries (one for post likes, one for comment likes) and combined
them with `Coalesce`, preventing the cartesian multiplication while keeping
the query performant.
