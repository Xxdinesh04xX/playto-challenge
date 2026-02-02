from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from community.models import Comment, CommentLike, Post, PostLike


User = get_user_model()


class LeaderboardTestCase(APITestCase):
    def test_leaderboard_only_counts_last_24_hours(self):
        author_a = User.objects.create_user(username="author_a")
        author_b = User.objects.create_user(username="author_b")
        liker_1 = User.objects.create_user(username="liker_1")
        liker_2 = User.objects.create_user(username="liker_2")
        liker_3 = User.objects.create_user(username="liker_3")

        post_a = Post.objects.create(author=author_a, content="Post A")
        comment_b = Comment.objects.create(
            post=post_a, author=author_b, content="Comment B"
        )

        PostLike.objects.create(user=liker_1, post=post_a)
        PostLike.objects.create(user=liker_2, post=post_a)

        old_like = PostLike.objects.create(user=liker_3, post=post_a)
        PostLike.objects.filter(pk=old_like.pk).update(
            created_at=timezone.now() - timedelta(hours=25)
        )

        CommentLike.objects.create(user=liker_1, comment=comment_b)
        CommentLike.objects.create(user=liker_2, comment=comment_b)
        CommentLike.objects.create(user=author_a, comment=comment_b)

        response = self.client.get("/api/leaderboard/")
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertEqual(data[0]["id"], author_a.id)
        self.assertEqual(data[0]["karma"], 10)
        self.assertEqual(data[1]["id"], author_b.id)
        self.assertEqual(data[1]["karma"], 3)
