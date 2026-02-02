from django.contrib.auth import get_user_model
from rest_framework import serializers

from community.models import Comment, Notification, Post


User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username"]


class PostListSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    like_count = serializers.IntegerField(read_only=True)
    comment_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Post
        fields = ["id", "author", "content", "created_at", "like_count", "comment_count"]


class PostDetailSerializer(PostListSerializer):
    class Meta(PostListSerializer.Meta):
        fields = PostListSerializer.Meta.fields


class CommentSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    like_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Comment
        fields = [
            "id",
            "post_id",
            "author",
            "parent_id",
            "content",
            "created_at",
            "like_count",
        ]


class LeaderboardEntrySerializer(serializers.ModelSerializer):
    karma = serializers.IntegerField(read_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "karma"]


def build_comment_tree(serialized_comments):
    nodes = {}
    roots = []

    for item in serialized_comments:
        node = dict(item)
        node["replies"] = []
        nodes[item["id"]] = node

    for item in serialized_comments:
        node = nodes[item["id"]]
        parent_id = item.get("parent_id")
        if parent_id and parent_id in nodes:
            nodes[parent_id]["replies"].append(node)
        else:
            roots.append(node)

    return roots


class NotificationSerializer(serializers.ModelSerializer):
    actor = UserSerializer(read_only=True)

    class Meta:
        model = Notification
        fields = ["id", "actor", "verb", "post_id", "comment_id", "created_at", "is_read"]
