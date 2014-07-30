(function(){"use strict";function normalize(expr){for(var i=0;i<primitives.length;i++)if(primitives[i](expr))return _.isRegExp(expr)?{$regex:expr}:{$eq:expr};if(_.isObject(expr)){var operators=_.union(Ops.queryOperators,Ops.customOperators),keys=_.keys(expr),notQuery=0===_.intersection(operators,keys).length;if(notQuery)return{$eq:expr};if(_.contains(keys,"$regex")){var regex=expr.$regex,options=expr.$options||"",modifiers="";_.isString(regex)&&(modifiers+=regex.ignoreCase||options.indexOf("i")>=0?"i":"",modifiers+=regex.multiline||options.indexOf("m")>=0?"m":"",modifiers+=regex.global||options.indexOf("g")>=0?"g":"",regex=new RegExp(regex,modifiers)),expr.$regex=regex,delete expr.$options}}return expr}var previousMingo,_,root=this,Mingo={};null!=root&&(previousMingo=root.Mingo),Mingo.noConflict=function(){return root.Mingo=previousMingo,Mingo},"undefined"!=typeof exports?(exports="undefined"!=typeof module&&module.exports?module.exports=Mingo:Mingo,_=require("underscore")):(root.Mingo=Mingo,_=root._);var primitives=[_.isString,_.isBoolean,_.isNumber,_.isDate,_.isNull,_.isRegExp],settings={key:"_id"};Mingo.setup=function(options){_.extend(settings,options||{})},Mingo.Query=function(criteria){this._criteria=criteria||{},this._compiledSelectors=[],this._compile()},Mingo.Query.prototype={_compile:function(){if(!_.isEmpty(this._criteria)){if(_.isArray(this._criteria)||_.isFunction(this._criteria)||!_.isObject(this._criteria))throw new Error("Invalid type for criteria");for(var name in this._criteria)if(this._criteria.hasOwnProperty(name)){var expr=this._criteria[name];if(_.contains(Ops.compoundOperators,name)){if(_.contains(["$not"],name))throw Error("Invalid operator");this._processOperator(name,name,expr)}else{expr=normalize(expr);for(var op in expr)expr.hasOwnProperty(op)&&this._processOperator(name,op,expr[op])}}}},_processOperator:function(field,operator,value){var compiledSelector;if(_.contains(Ops.simpleOperators,operator))compiledSelector={test:function(obj){var actualValue=Mingo._resolve(obj,field);return simpleOperators[operator](actualValue,value)}};else if(_.contains(Ops.compoundOperators,operator))compiledSelector=compoundOperators[operator](field,value);else{if(!_.contains(Ops.customOperators,operator))throw Error("Invalid query operator '"+operator+"' detected");compiledSelector=customOperators[operator](field,value)}this._compiledSelectors.push(compiledSelector)},test:function(model){for(var match=!0,i=0;i<this._compiledSelectors.length;i++){var compiled=this._compiledSelectors[i];if(match=compiled.test(model),match===!1)break}return match},find:function(collection,projection){return new Mingo.Cursor(collection,this,projection)},remove:function(collection){for(var arr=[],i=0;i<collection.length;i++)this.test(collection[i])===!1&&arr.push(collection[i]);return arr}},Mingo.Cursor=function(collection,query,projection){this._query=query,this._collection=collection,this._projection=projection,this._operators={},this._result=!1,this._position=0},Mingo.Cursor.prototype={_fetch:function(){var self=this;if(this._result===!1){if(_.isObject(this._projection)&&_.extend(this._operators,{$project:this._projection}),!_.isArray(this._collection))throw Error("Input collection is not of a valid type.");this._result=_.filter(this._collection,this._query.test,this._query);var pipeline=[];if(_.each(["$sort","$skip","$limit","$project"],function(op){_.has(self._operators,op)&&pipeline.push(_.pick(self._operators,op))}),pipeline.length>0){var aggregator=new Mingo.Aggregator(pipeline);this._result=aggregator.run(this._result,this._query)}}return this._result},all:function(){return this._fetch()},first:function(){return this.count()>0?this._fetch()[0]:null},last:function(){return this.count()>0?this._fetch()[this.count()-1]:null},count:function(){return this._fetch().length},skip:function(n){return _.extend(this._operators,{$skip:n}),this},limit:function(n){return _.extend(this._operators,{$limit:n}),this},sort:function(modifier){return _.extend(this._operators,{$sort:modifier}),this},next:function(){return this.hasNext()?this._fetch()[this._position++]:!1},hasNext:function(){return this.count()>this._position},max:function(expr){return groupOperators.$max(this._fetch(),expr)},min:function(expr){return groupOperators.$min(this._fetch(),expr)},map:function(callback){return _.map(this._fetch(),callback)},forEach:function(callback){_.each(this._fetch(),callback)}},Mingo.Aggregator=function(operators){this._operators=operators},Mingo.Aggregator.prototype={run:function(collection,query){if(!_.isEmpty(this._operators))for(var i=0;i<this._operators.length;i++){var operator=this._operators[i];for(var key in operator)operator.hasOwnProperty(key)&&(collection=query?pipelineOperators[key].call(query,collection,operator[key]):pipelineOperators[key](collection,operator[key]))}return collection}},Mingo._get=function(obj,field){return _.result(obj,field)},Mingo._resolve=function(obj,field){if(!field)return void 0;for(var isText,names=field.split("."),value=obj,i=0;i<names.length;i++){if(isText=null===names[i].match(/^\d+$/),isText&&_.isArray(value)){var res=[];_.each(value,function(item){_.isObject(item)&&res.push(Mingo._resolve(item,names[i]))}),value=res}else value=Mingo._get(value,names[i]);if(void 0===value)break}return value},Mingo.compile=function(criteria){return new Mingo.Query(criteria)},Mingo.find=function(collection,criteria,projection){return new Mingo.Query(criteria).find(collection,projection)},Mingo.remove=function(collection,criteria){return new Mingo.Query(criteria).remove(collection)},Mingo.aggregate=function(collection,pipeline){if(!_.isArray(pipeline))throw Error("Aggregation pipeline must be an array");return new Mingo.Aggregator(pipeline).run(collection)},Mingo.CollectionMixin={query:function(criteria,projection){return Mingo.find(this.toJSON(),criteria,projection)},aggregate:function(pipeline){var args=[this.toJSON(),pipeline];return Mingo.aggregate.apply(null,args)}};var customOperators={};Mingo.addOperator=function(operator,fn){if(operator&&"$"!==operator[0])throw new Error("Invalid name, custom operator must start with '$'");if(_.contains(Ops.queryOperators,operator))throw new Error("Invalid name, cannot override default operator '"+operator+"'");customOperators[operator]=fn,Ops.customOperators.push(operator),Ops.customOperators=_.uniq(Ops.customOperators)};var pipelineOperators={$group:function(collection,expr){var idKey=expr[settings.key],indexes=[],groups=_.groupBy(collection,function(obj){var key=computeValue(obj,idKey,idKey);return indexes.push(key),key});indexes=_.uniq(indexes),expr=_.omit(expr,settings.key);var result=[];return _.each(indexes,function(index){var obj={};obj[settings.key]=index;for(var key in expr)expr.hasOwnProperty(key)&&(obj[key]=accumulate(groups[index],key,expr[key]));result.push(obj)}),result},$match:function(collection,expr){var query=new Mingo.Query(expr);return query.find(collection).all()},$project:function(collection,expr){var projected=[],objKeys=_.keys(expr),removeId=!1;if(_.contains(objKeys,settings.key)){var id=objKeys[settings.key];removeId=0===id||id===!1}for(var i=0;i<collection.length;i++){var obj=collection[i],cloneObj={};_.each(objKeys,function(key){if(!removeId||key!==settings.key){var subExpr=expr[key];if(_.isString(subExpr))cloneObj[key]=computeValue(obj,subExpr,key);else if(1===subExpr||subExpr===!0)cloneObj[key]=_.result(obj,key);else if(_.isObject(subExpr)){var operator=_.keys(subExpr);if(operator=operator.length>1?!1:operator[0],operator!==!1&&_.contains(Ops.projectionOperators,operator)){var temp=projectionOperators[operator](obj,subExpr[operator],key);_.isUndefined(temp)||(cloneObj[key]=temp)}else cloneObj[key]=computeValue(obj,subExpr,key)}}}),removeId||_.has(cloneObj,settings.key)||(cloneObj[settings.key]=obj[settings.key]),projected.push(cloneObj)}return projected},$limit:function(collection,value){return _.first(collection,value)},$skip:function(collection,value){return _.rest(collection,value)},$unwind:function(collection,expr){for(var result=[],field=expr.substr(1),i=0;i<collection.length;i++){var obj=collection[i],value=Mingo._get(obj,field);if(!_.isArray(value))throw new Error("Target field '"+field+"' is not of type Array.");_.each(value,function(item){var tmp=_.clone(obj);tmp[field]=item,result.push(tmp)})}return result},$sort:function(collection,sortKeys){if(!_.isEmpty(sortKeys)&&_.isObject(sortKeys)){var modifiers=_.keys(sortKeys);modifiers.reverse().forEach(function(key){var indexes=[],grouped=_.groupBy(collection,function(obj){var value=Mingo._resolve(obj,key);return indexes.push(value),value});indexes=_.sortBy(_.uniq(indexes),function(item){return item}),-1===sortKeys[key]&&indexes.reverse(),collection=[],_.each(indexes,function(item){Array.prototype.push.apply(collection,grouped[item])})})}return collection}},compoundOperators={$and:function(selector,value){if(!_.isArray(value))throw new Error("Invalid expression for $and criteria");var queries=[];return _.each(value,function(expr){queries.push(new Mingo.Query(expr))}),{test:function(obj){for(var i=0;i<queries.length;i++)if(queries[i].test(obj)===!1)return!1;return!0}}},$or:function(selector,value){if(!_.isArray(value))throw new Error("Invalid expression for $or criteria");var queries=[];return _.each(value,function(expr){queries.push(new Mingo.Query(expr))}),{test:function(obj){for(var i=0;i<queries.length;i++)if(queries[i].test(obj)===!0)return!0;return!1}}},$nor:function(selector,value){if(!_.isArray(value))throw new Error("Invalid expression for $nor criteria");var query=this.$or("$or",value);return{test:function(obj){return!query.test(obj)}}},$not:function(selector,value){var criteria={};criteria[selector]=normalize(value);var query=new Mingo.Query(criteria);return{test:function(obj){return!query.test(obj)}}},$where:function(selector,value){return _.isFunction(value)||(value=new Function("return "+value+";")),{test:function(obj){return value.call(obj)===!0}}}},simpleOperators={$eq:function(a,b){return a=_.isArray(a)?a:[a],a=_.find(a,function(val){return _.isEqual(val,b)}),void 0!==a},$ne:function(a,b){return!this.$eq(a,b)},$in:function(a,b){return a=_.isArray(a)?a:[a],_.intersection(a,b).length>0},$nin:function(a,b){return _.isUndefined(a)||!this.$in(a,b)},$lt:function(a,b){return a=_.isArray(a)?a:[a],a=_.find(a,function(val){return b>val}),void 0!==a},$lte:function(a,b){return a=_.isArray(a)?a:[a],a=_.find(a,function(val){return b>=val}),void 0!==a},$gt:function(a,b){return a=_.isArray(a)?a:[a],a=_.find(a,function(val){return val>b}),void 0!==a},$gte:function(a,b){return a=_.isArray(a)?a:[a],a=_.find(a,function(val){return val>=b}),void 0!==a},$mod:function(a,b){return a=_.isArray(a)?a:[a],a=_.find(a,function(val){return _.isNumber(val)&&_.isArray(b)&&2===b.length&&val%b[0]===b[1]}),void 0!==a},$regex:function(a,b){return a=_.isArray(a)?a:[a],a=_.find(a,function(val){return _.isString(val)&&_.isRegExp(b)&&!!val.match(b)}),void 0!==a},$exists:function(a,b){return b===!1&&_.isUndefined(a)||b===!0&&!_.isUndefined(a)},$all:function(a,b){var self=this,matched=!1;if(_.isArray(a)&&_.isArray(b))for(var i=0;i<b.length;i++){if(!_.isObject(b[i])||!_.contains(_.keys(b[i]),"$elemMatch"))return _.intersection(b,a).length===b.length;matched=matched||self.$elemMatch(a,b[i].$elemMatch)}return matched},$size:function(a,b){return _.isArray(a)&&_.isNumber(b)&&a.length===b},$elemMatch:function(a,b){if(_.isArray(a)&&!_.isEmpty(a))for(var query=new Mingo.Query(b),i=0;i<a.length;i++)if(query.test(a[i]))return!0;return!1},$type:function(a,b){switch(b){case 1:return _.isNumeric(a)&&-1!==(a+"").indexOf(".");case 2:case 5:return _.isString(a);case 3:return _.isObject(a);case 4:return _.isArray(a);case 8:return _.isBoolean(a);case 9:return _.isDate(a);case 10:return _.isNull(a);case 11:return _.isRegExp(a);case 16:return _.isNumeric(a)&&2147483647>=a&&-1===(a+"").indexOf(".");case 18:return _.isNumeric(a)&&a>2147483647&&0x8000000000000000>=a&&-1===(a+"").indexOf(".");default:return!1}}},projectionOperators={$:function(){throw new Error("$ not implemented")},$elemMatch:function(obj,expr,field){var array=Mingo._resolve(obj,field),query=new Mingo.Query(expr);if(_.isUndefined(array)||!_.isArray(array))return void 0;for(var i=0;i<array.length;i++)if(query.test(array[i]))return array[i];return void 0},$slice:function(obj,expr,field){var array=Mingo._resolve(obj,field);return _.isUndefined(array)?void 0:(_.isArray(expr)||(expr=[expr]),Array.prototype.slice.apply(array,expr))}},groupOperators={$addToSet:function(collection,expr){var result=_.map(collection,function(obj){return computeValue(obj,expr)});return _.uniq(result)},$sum:function(collection,expr){return _.isNumber(expr)?collection.length*expr:_.reduce(collection,function(acc,obj){return acc+computeValue(obj,expr)},0)},$max:function(collection,expr){var obj=_.max(collection,function(obj){return computeValue(obj,expr)});return computeValue(obj,expr)},$min:function(collection,expr){var obj=_.min(collection,function(obj){return computeValue(obj,expr)});return computeValue(obj,expr)},$avg:function(collection,expr){return this.$sum(collection,expr)/collection.length},$push:function(collection,expr){return _.map(collection,function(obj){return computeValue(obj,expr)})},$first:function(collection,expr){return collection.length>0?computeValue(collection[0],expr):void 0},$last:function(collection,expr){return collection.length>0?computeValue(collection[collection.length-1],expr):void 0}},aggregateOperators={$add:function(obj,expr){var args=computeValue(obj,expr);return _.reduce(args,function(memo,num){return memo+num},0)},$subtract:function(obj,expr){var args=computeValue(obj,expr);return args[0]-args[1]},$divide:function(obj,expr){var args=computeValue(obj,expr);return args[0]/args[1]},$multiply:function(obj,expr){var args=computeValue(obj,expr);return _.reduce(args,function(memo,num){return memo*num},1)},$mod:function(obj,expr){var args=computeValue(obj,expr);return args[0]%args[1]},$cmp:function(obj,expr){var args=computeValue(obj,expr);return args[0]>args[1]?1:args[0]<args[1]?-1:0},$concat:function(obj,expr){var args=computeValue(obj,expr);return args.join("")},$strcasecmp:function(obj,expr){var args=computeValue(obj,expr);return args[0]=args[0].toUpperCase(),args[1]=args[1].toUpperCase(),args[0]>args[1]?1:args[0]<args[1]?-1:0},$substr:function(obj,expr){var args=computeValue(obj,expr);return _.isString(args[0])?args[0].substr(args[1],args[2]):void 0},$toLower:function(obj,expr){var value=computeValue(obj,expr);return value.toLowerCase()},$toUpper:function(obj,expr){var value=computeValue(obj,expr);return value.toUpperCase()}},setOperators={$setEquals:function(obj,expr){var args=computeValue(obj,expr);return 0===_.difference(args[0],args[1]).length},$setIntersection:function(obj,expr){var args=computeValue(obj,expr);return _.intersection(args[0],args[1])},$setDifference:function(obj,expr){var args=computeValue(obj,expr);return _.difference(args[0],args[1])},$setUnion:function(obj,expr){var args=computeValue(obj,expr);return _.union(args[0],args[1])},$setIsSubset:function(obj,expr){var args=computeValue(obj,expr);return _.intersection(args[0],args[1]).length===args[0].length},$anyElementTrue:function(obj,expr){for(var args=computeValue(obj,expr),i=0;i<args.length;i++)if(args[i])return!0;return!1},$allElementsTrue:function(obj,expr){for(var args=computeValue(obj,expr),i=0;i<args.length;i++)if(!args[i])return!1;return!0}},conditionalOperators={$cond:function(obj,expr){var ifExpr,thenExpr,elseExpr;if(_.isArray(expr)){if(3!=expr.length)throw Error("Invalid arguments for $cond operator");ifExpr=expr[0],thenExpr=expr[1],elseExpr=expr[2]}else _.isObject(expr)&&(ifExpr=expr["if"],thenExpr=expr.then,elseExpr=expr["else"]);var condition=computeValue(obj,ifExpr);return condition?computeValue(obj,thenExpr):computeValue(obj,elseExpr)},$ifNull:function(obj,expr){if(!_.isArray(expr)||2!=expr.length)throw Error("Invalid arguments for $ifNull operator");var args=computeValue(obj,expr);return null===args[0]||void 0===args[0]?args[1]:args[0]}};_.each(["$eq","$ne","$gt","$gte","$lt","$lte"],function(op){aggregateOperators[op]=function(obj,expr){var args=computeValue(obj,expr);return simpleOperators[op](args[0],args[1])}}),_.extend(aggregateOperators,setOperators,conditionalOperators);var Ops={simpleOperators:_.keys(simpleOperators),compoundOperators:_.keys(compoundOperators),setOperators:_.keys(setOperators),aggregateOperators:_.keys(aggregateOperators),groupOperators:_.keys(groupOperators),pipelineOperators:_.keys(pipelineOperators),projectionOperators:_.keys(projectionOperators),customOperators:[]};Ops.queryOperators=_.union(Ops.simpleOperators,Ops.compoundOperators);var accumulate=function(collection,field,expr){if(_.contains(Ops.groupOperators,field))return groupOperators[field](collection,expr);if(_.isObject(expr)){var result={};for(var key in expr)if(expr.hasOwnProperty(key)&&(result[key]=accumulate(collection,key,expr[key]),_.contains(Ops.groupOperators,key))){if(result=result[key],_.keys(expr).length>1)throw new Error("Invalid $group expression '"+JSON.stringify(expr)+"'");break}return result}return void 0},computeValue=function(obj,expr,field){if(_.contains(Ops.aggregateOperators,field))return aggregateOperators[field](obj,expr);if(_.isString(expr)&&expr.length>0&&"$"===expr[0])return Mingo._resolve(obj,expr.slice(1));var result;if(_.isArray(expr)){result=[];for(var i=0;i<expr.length;i++)result.push(computeValue(obj,expr[i],null))}else if(_.isObject(expr)){result={};for(var key in expr)if(expr.hasOwnProperty(key)&&(result[key]=computeValue(obj,expr[key],key),_.contains(Ops.aggregateOperators,key))){if(result=result[key],_.keys(expr).length>1)throw new Error("Invalid aggregation expression '"+JSON.stringify(expr)+"'");break}}else for(var i=0;i<primitives.length;i++)if(primitives[i](expr))return expr;return result}}).call(this);