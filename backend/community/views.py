from datetime import timedelta
import re

from django.contrib.auth import authenticate, get_user_model
from django.db import IntegrityError, transaction
from django.db.models import Count, ExpressionWrapper, F, IntegerField, OuterRef, Q, Subquery, Value
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from community.models import Comment, CommentLike, Notification, Post, PostLike
from community.serializers import (
    CommentSerializer,
    LeaderboardEntrySerializer,
    NotificationSerializer,
    PostDetailSerializer,
    PostListSerializer,
    build_comment_tree,
)


User = get_user_model()


def get_user_by_id(user_id):
    if not user_id:
        return None
    try:
        return User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return None


MENTION_PATTERN = re.compile(r"@([A-Za-z0-9_]+)")
BANNED_WORDS = {
    "asshole",
    "bastard",
    "bitch",
    "dick",
    "fuck",
    "pedophile",
    "rape",
    "rapist",
    "shit",
    "slut",
}
BANNED_PATTERN = re.compile(
    r"\b(" + "|".join(re.escape(word) for word in sorted(BANNED_WORDS)) + r")\b",
    re.IGNORECASE,
)


def extract_mentions(text):
    if not text:
        return []
    return list({match.group(1) for match in MENTION_PATTERN.finditer(text)})


def find_banned_words(text):
    if not text:
        return []
    return list({match.group(0).lower() for match in BANNED_PATTERN.finditer(text)})


def create_notification(*, recipient, actor, verb, post=None, comment=None):
    if recipient.id == actor.id:
        return
    Notification.objects.create(
        recipient=recipient,
        actor=actor,
        verb=verb,
        post=post,
        comment=comment,
    )


def notify_mentions(*, text, actor, post=None, comment=None):
    mentions = extract_mentions(text)
    if not mentions:
        return
    users = User.objects.filter(username__in=mentions).exclude(pk=actor.id)
    for user in users:
        create_notification(
            recipient=user,
            actor=actor,
            verb="mention_comment" if comment else "mention_post",
            post=post,
            comment=comment,
        )


class AuthSignupView(APIView):
    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")
        if not username or not password:
            return Response(
                {"detail": "username and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            user = User.objects.create_user(username=username, password=password)
        except IntegrityError:
            return Response({"detail": "username already exists."}, status=status.HTTP_409_CONFLICT)
        return Response({"id": user.id, "username": user.username}, status=status.HTTP_201_CREATED)


class AuthLoginView(APIView):
    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")
        if not username or not password:
            return Response(
                {"detail": "username and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user = authenticate(username=username, password=password)
        if not user:
            return Response({"detail": "invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)
        return Response({"id": user.id, "username": user.username}, status=status.HTTP_200_OK)


class PostListCreateView(APIView):
    def get(self, request):
        search = request.query_params.get("search", "").strip()
        sort = request.query_params.get("sort", "new")
        try:
            limit = max(1, min(int(request.query_params.get("limit", 10)), 50))
        except ValueError:
            limit = 10
        try:
            offset = max(0, int(request.query_params.get("offset", 0)))
        except ValueError:
            offset = 0

        posts = Post.objects.select_related("author").annotate(
            like_count=Count("likes", distinct=True),
            comment_count=Count("comments", distinct=True),
        )

        if search:
            posts = posts.filter(
                Q(content__icontains=search) | Q(author__username__icontains=search)
            )

        if sort == "top":
            posts = posts.order_by("-like_count", "-created_at")
        elif sort == "discussed":
            posts = posts.order_by("-comment_count", "-created_at")
        else:
            posts = posts.order_by("-created_at")

        total = posts.count()
        page = posts[offset : offset + limit]
        serializer = PostListSerializer(page, many=True)
        return Response(
            {
                "results": serializer.data,
                "total": total,
                "limit": limit,
                "offset": offset,
                "has_more": offset + limit < total,
            }
        )

    def post(self, request):
        author_id = request.data.get("author_id")
        content = request.data.get("content")
        if not author_id or not content:
            return Response(
                {"detail": "author_id and content are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        banned = find_banned_words(content)
        if banned:
            return Response(
                {
                    "detail": "Inappropriate language is not allowed.",
                    "banned_words": banned,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        author = get_user_by_id(author_id)
        if not author:
            return Response({"detail": "author not found."}, status=status.HTTP_404_NOT_FOUND)
        post = Post.objects.create(author=author, content=content)
        post.like_count = 0
        post.comment_count = 0
        notify_mentions(text=content, actor=author, post=post)
        serializer = PostListSerializer(post)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class PostDetailView(APIView):
    def get(self, request, post_id):
        post = get_object_or_404(
            Post.objects.select_related("author").annotate(
                like_count=Count("likes", distinct=True),
                comment_count=Count("comments", distinct=True),
            ),
            pk=post_id,
        )
        serializer = PostDetailSerializer(post)
        return Response(serializer.data)


class PostCommentsView(APIView):
    def get(self, request, post_id):
        try:
            limit = max(1, min(int(request.query_params.get("limit", 10)), 50))
        except ValueError:
            limit = 10
        try:
            offset = max(0, int(request.query_params.get("offset", 0)))
        except ValueError:
            offset = 0

        post = get_object_or_404(Post, pk=post_id)
        comments = (
            Comment.objects.filter(post=post)
            .select_related("author")
            .annotate(like_count=Count("likes", distinct=True))
            .order_by("created_at")
        )
        serialized_comments = CommentSerializer(comments, many=True).data
        comment_tree = build_comment_tree(serialized_comments)

        total = len(comment_tree)
        page = comment_tree[offset : offset + limit]
        return Response(
            {
                "results": page,
                "total": total,
                "limit": limit,
                "offset": offset,
                "has_more": offset + limit < total,
            }
        )

    def post(self, request, post_id):
        author_id = request.data.get("author_id")
        content = request.data.get("content")
        parent_id = request.data.get("parent_id")

        if not author_id or not content:
            return Response(
                {"detail": "author_id and content are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        banned = find_banned_words(content)
        if banned:
            return Response(
                {
                    "detail": "Inappropriate language is not allowed.",
                    "banned_words": banned,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        author = get_user_by_id(author_id)
        if not author:
            return Response({"detail": "author not found."}, status=status.HTTP_404_NOT_FOUND)

        post = get_object_or_404(Post, pk=post_id)

        parent = None
        if parent_id:
            parent = get_object_or_404(Comment, pk=parent_id)
            if parent.post_id != post.id:
                return Response(
                    {"detail": "parent comment does not belong to this post."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        comment = Comment.objects.create(
            post=post, author=author, content=content, parent=parent
        )
        comment.like_count = 0
        notify_mentions(text=content, actor=author, post=post, comment=comment)

        if parent:
            create_notification(
                recipient=parent.author,
                actor=author,
                verb="reply",
                post=post,
                comment=comment,
            )
        elif post.author_id != author.id:
            create_notification(
                recipient=post.author,
                actor=author,
                verb="comment",
                post=post,
                comment=comment,
            )
        serializer = CommentSerializer(comment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class PostLikeView(APIView):
    def post(self, request, post_id):
        user_id = request.data.get("user_id")
        if not user_id:
            return Response({"detail": "user_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        user = get_user_by_id(user_id)
        if not user:
            return Response({"detail": "user not found."}, status=status.HTTP_404_NOT_FOUND)

        post = get_object_or_404(Post, pk=post_id)

        liked = False
        try:
            with transaction.atomic():
                existing = PostLike.objects.filter(user=user, post=post).first()
                if existing:
                    existing.delete()
                    liked = False
                else:
                    PostLike.objects.create(user=user, post=post)
                    liked = True
                    create_notification(
                        recipient=post.author,
                        actor=user,
                        verb="like_post",
                        post=post,
                    )
        except IntegrityError:
            liked = True

        return Response({"liked": liked}, status=status.HTTP_200_OK)


class CommentLikeView(APIView):
    def post(self, request, comment_id):
        user_id = request.data.get("user_id")
        if not user_id:
            return Response({"detail": "user_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        user = get_user_by_id(user_id)
        if not user:
            return Response({"detail": "user not found."}, status=status.HTTP_404_NOT_FOUND)

        comment = get_object_or_404(Comment, pk=comment_id)

        liked = False
        try:
            with transaction.atomic():
                existing = CommentLike.objects.filter(user=user, comment=comment).first()
                if existing:
                    existing.delete()
                    liked = False
                else:
                    CommentLike.objects.create(user=user, comment=comment)
                    liked = True
                    create_notification(
                        recipient=comment.author,
                        actor=user,
                        verb="like_comment",
                        post=comment.post,
                        comment=comment,
                    )
        except IntegrityError:
            liked = True

        return Response({"liked": liked}, status=status.HTTP_200_OK)


class LeaderboardView(APIView):
    def get(self, request):
        since = timezone.now() - timedelta(hours=24)

        post_like_subquery = (
            PostLike.objects.filter(
                post__author=OuterRef("pk"), created_at__gte=since
            )
            .values("post__author")
            .annotate(
                total=ExpressionWrapper(
                    Count("id") * Value(5), output_field=IntegerField()
                )
            )
            .values("total")
        )
        comment_like_subquery = (
            CommentLike.objects.filter(
                comment__author=OuterRef("pk"), created_at__gte=since
            )
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
                post_karma=Coalesce(
                    Subquery(post_like_subquery, output_field=IntegerField()),
                    Value(0),
                ),
                comment_karma=Coalesce(
                    Subquery(comment_like_subquery, output_field=IntegerField()),
                    Value(0),
                ),
            )
            .annotate(karma=F("post_karma") + F("comment_karma"))
            .filter(karma__gt=0)
            .order_by("-karma", "id")[:5]
        )

        serializer = LeaderboardEntrySerializer(users, many=True)
        return Response(serializer.data)


class UserProfileView(APIView):
    def get(self, request, user_id):
        user = get_object_or_404(User, pk=user_id)
        since = timezone.now() - timedelta(hours=24)

        post_count = Post.objects.filter(author=user).count()
        comment_count = Comment.objects.filter(author=user).count()
        post_like_count = PostLike.objects.filter(post__author=user).count()
        comment_like_count = CommentLike.objects.filter(comment__author=user).count()

        post_karma = PostLike.objects.filter(
            post__author=user, created_at__gte=since
        ).count() * 5
        comment_karma = CommentLike.objects.filter(
            comment__author=user, created_at__gte=since
        ).count() * 1

        recent_posts = (
            Post.objects.filter(author=user)
            .select_related("author")
            .annotate(
                like_count=Count("likes", distinct=True),
                comment_count=Count("comments", distinct=True),
            )
            .order_by("-created_at")[:5]
        )
        recent_comments = (
            Comment.objects.filter(author=user)
            .select_related("author")
            .annotate(like_count=Count("likes", distinct=True))
            .order_by("-created_at")[:5]
        )

        return Response(
            {
                "id": user.id,
                "username": user.username,
                "stats": {
                    "posts": post_count,
                    "comments": comment_count,
                    "post_likes": post_like_count,
                    "comment_likes": comment_like_count,
                    "karma_last_24h": post_karma + comment_karma,
                },
                "recent_posts": PostListSerializer(recent_posts, many=True).data,
                "recent_comments": CommentSerializer(recent_comments, many=True).data,
            }
        )


class UserLookupView(APIView):
    def get(self, request):
        username = request.query_params.get("username", "").strip()
        if not username:
            return Response({"detail": "username is required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({"detail": "user not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response({"id": user.id, "username": user.username})


class NotificationListView(APIView):
    def get(self, request):
        user_id = request.query_params.get("user_id")
        if not user_id:
            return Response({"detail": "user_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        user = get_user_by_id(user_id)
        if not user:
            return Response({"detail": "user not found."}, status=status.HTTP_404_NOT_FOUND)

        unread_only = request.query_params.get("unread_only") == "1"
        try:
            limit = max(1, min(int(request.query_params.get("limit", 20)), 50))
        except ValueError:
            limit = 20
        try:
            offset = max(0, int(request.query_params.get("offset", 0)))
        except ValueError:
            offset = 0

        notifications = Notification.objects.filter(recipient=user).select_related("actor")
        if unread_only:
            notifications = notifications.filter(is_read=False)

        total = notifications.count()
        page = notifications[offset : offset + limit]
        serializer = NotificationSerializer(page, many=True)
        return Response(
            {
                "results": serializer.data,
                "total": total,
                "limit": limit,
                "offset": offset,
                "has_more": offset + limit < total,
            }
        )


class NotificationMarkReadView(APIView):
    def post(self, request):
        user_id = request.data.get("user_id")
        notification_id = request.data.get("notification_id")
        if not user_id:
            return Response({"detail": "user_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        user = get_user_by_id(user_id)
        if not user:
            return Response({"detail": "user not found."}, status=status.HTTP_404_NOT_FOUND)

        notifications = Notification.objects.filter(recipient=user, is_read=False)
        if notification_id:
            notifications = notifications.filter(pk=notification_id)

        updated = notifications.update(is_read=True)
        return Response({"updated": updated})
