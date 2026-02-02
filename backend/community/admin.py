from django.contrib import admin

from community.models import Comment, CommentLike, Notification, Post, PostLike


admin.site.register(Post)
admin.site.register(Comment)
admin.site.register(PostLike)
admin.site.register(CommentLike)
admin.site.register(Notification)
