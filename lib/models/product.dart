// 🛍️ E-Commerce Product Model
class Product {
  final String id;
  final String name;
  final String description;
  final double price;
  final String imageUrl;
  final String category;
  final List<String> colors;
  final List<String> sizes;
  final double rating;
  final int reviewCount;
  final bool inStock;

  Product({
    required this.id,
    required this.name,
    required this.description,
    required this.price,
    required this.imageUrl,
    required this.category,
    this.colors = const [],
    this.sizes = const [],
    this.rating = 0.0,
    this.reviewCount = 0,
    this.inStock = true,
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'price': price,
      'imageUrl': imageUrl,
      'category': category,
      'colors': colors,
      'sizes': sizes,
      'rating': rating,
      'reviewCount': reviewCount,
      'inStock': inStock,
    };
  }

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: json['id'],
      name: json['name'],
      description: json['description'],
      price: json['price'].toDouble(),
      imageUrl: json['imageUrl'],
      category: json['category'],
      colors: List<String>.from(json['colors'] ?? []),
      sizes: List<String>.from(json['sizes'] ?? []),
      rating: json['rating']?.toDouble() ?? 0.0,
      reviewCount: json['reviewCount'] ?? 0,
      inStock: json['inStock'] ?? true,
    );
  }
}
