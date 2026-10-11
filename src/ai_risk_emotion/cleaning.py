import hashlib
import html
import re
import unicodedata


URL_RE = re.compile(r"https?://\S+|www\.\S+", re.IGNORECASE)
MENTION_RE = re.compile(r"(?<!\w)@[\w\-\u4e00-\u9fff]+")
SPACE_RE = re.compile(r"\s+")
REPOST_PREFIX_RE = re.compile(r"^(?:转发微博|轉發微博)\s*[。.!！]?$", re.IGNORECASE)


def clean_text(text: object) -> str:
    """Normalize social text while retaining hashtags and emoji."""
    if text is None:
        return ""
    value = unicodedata.normalize("NFKC", html.unescape(str(text)))
    value = URL_RE.sub(" [URL] ", value)
    value = MENTION_RE.sub(" [USER] ", value)
    value = SPACE_RE.sub(" ", value).strip()
    if REPOST_PREFIX_RE.fullmatch(value):
        return ""
    return value


def text_hash(text: str) -> str:
    normalized = clean_text(text).casefold()
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()

